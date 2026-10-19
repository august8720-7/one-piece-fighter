"""Synthetic tool-mechanics checks only; fixtures are never adopted artwork."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image

SCRIPTS = Path(__file__).resolve().parents[1]/'scripts'
sys.path.insert(0,str(SCRIPTS))
spec = importlib.util.spec_from_file_location('roster_fx_builder',SCRIPTS/'build_roster_fx1003.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class BuilderChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='roster-fx-tool-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.sheet = Image.new('RGBA',(6,3),(7,13,19,2))
        self.sheet.putpixel((1,1),(20,60,190,121))
        self.sheet.putpixel((4,1),(200,90,30,255))
        (self.root/'catalog.json').write_text(json.dumps({'sources':{'fixture':{
            'adoptionStatus':'shape_reviewed_candidate','sha256':'0'*64}}}))
        self.manifest = self.root/'manifest.json'
        self.config = {'schemaVersion':1,'catalog':'catalog.json','maxCropEdgeAlpha':4,
                       'characters':{'aokiji':{'source':'fixture','crops':{'ice_lance':[0,0,3,3],'ice_impact':[3,0,3,3]}}}}
        self.write_spec()
        self.addCleanup(patch.stopall)
        patch.object(builder,'ROOT',self.root).start()
        patch.object(builder,'BACKUP_ROOT',self.root/'baseline').start()

    def write_spec(self):
        self.manifest.write_text(json.dumps(self.config),encoding='utf-8')

    def prepare_fixture(self):
        # Isolate crop/packing tests; real provenance rejection is tested separately.
        with patch.object(builder,'load_sources',return_value={'fixture':self.sheet}):
            return builder.prepare(self.manifest)

    def test_preserves_fractional_alpha_and_hidden_rgb_and_writes_hashes(self):
        outputs,report = self.prepare_fixture()
        builder.commit(outputs,report,self.root/'report.json')
        for row in report['outputs']:
            self.assertEqual(builder.digest((self.root/row['file']).read_bytes()),row['sha256'])
        with Image.open(self.root/'public/assets/fx/aokiji/atlas.png') as image:
            self.assertEqual(image.crop((8,8,11,11)).tobytes(),self.sheet.crop((0,0,3,3)).tobytes())
        self.assertTrue((self.root/'public/assets/fx/aokiji/README.md').is_file())

    def test_rejects_unreviewed_provenance_and_unapproved_character(self):
        with self.assertRaises(ValueError):builder.prepare(self.manifest)
        self.config['characters']['luffy']=self.config['characters'].pop('aokiji')
        self.write_spec()
        with self.assertRaisesRegex(ValueError,'19 explicit'):self.prepare_fixture()
        self.assertFalse((self.root/'public').exists())

    def test_rejects_missing_empty_outside_and_visible_edge_crops(self):
        self.config['characters']['aokiji']['crops'].pop('ice_impact')
        self.write_spec()
        with self.assertRaisesRegex(ValueError,'incomplete'):self.prepare_fixture()
        self.config['characters']['aokiji']['crops']['ice_impact']=[3,0,99,3]
        self.write_spec()
        with self.assertRaises(ValueError):self.prepare_fixture()
        self.config['characters']['aokiji']['crops']['ice_impact']=[3,0,3,3]
        self.write_spec()
        self.sheet.putpixel((0,0),(5,9,12,255))
        with self.assertRaisesRegex(ValueError,'visible alpha'):self.prepare_fixture()
        self.sheet = Image.new('RGBA',(6,3))
        with self.assertRaisesRegex(ValueError,'empty alpha'):self.prepare_fixture()

    def test_replacement_requires_verified_new_backup_and_retains_original_bytes(self):
        outputs,report = self.prepare_fixture()
        builder.commit(outputs,report,self.root/'initial.json')
        old = {p:p.read_bytes() for p in outputs}
        self.sheet.putpixel((1,1),(21,61,191,120))
        newer,new_report = self.prepare_fixture()
        with self.assertRaises(FileExistsError):builder.commit(newer,new_report,self.root/'rejected.json')
        with self.assertRaises(ValueError):builder.commit(newer,new_report,self.root/'rejected.json',True,self.root/'outside')
        for p,data in old.items():self.assertEqual(p.read_bytes(),data)
        backup=self.root/'baseline'/'one'
        builder.commit(newer,new_report,self.root/'changed.json',True,backup)
        for p,data in old.items():self.assertEqual((backup/'aokiji'/p.name).read_bytes(),data)
        self.assertTrue((backup/'copy-before.json').exists())
        self.assertTrue((backup/'copy-after.json').exists())
        self.assertNotEqual((self.root/'public/assets/fx/aokiji/atlas.png').read_bytes(),old[self.root/'public/assets/fx/aokiji/atlas.png'])

    def test_check_is_read_only_and_report_cannot_overwrite_assets(self):
        outputs,report = self.prepare_fixture()
        result=builder.commit(outputs,report,self.root/'check.json',check=True)
        self.assertTrue(result['checkOnly'])
        self.assertFalse((self.root/'public').exists())
        self.assertFalse((self.root/'check.json').exists())
        with self.assertRaises(FileExistsError):builder.commit(outputs,report,next(iter(outputs)))

    def test_schema_two_multiple_catalogs_frames_and_pages_preserve_each_original_crop(self):
        other = Image.new('RGBA',(3,3),(41,71,111,1))
        other.putpixel((1,1),(125,199,77,202))
        (self.root/'other.json').write_text(json.dumps({'sources':{'other':{
            'adoptionStatus':'shape_reviewed_candidate','sha256':'1'*64}}}))
        self.config = {'schemaVersion':2,'catalogs':['catalog.json','other.json'],'maxTextureSize':64,
            'characters':{'beckman':{'frames':{
                'muzzle_0':{'source':'fixture','crop':[0,0,3,3]},
                'muzzle_1':{'source':'fixture','crop':[3,0,3,3]},
                'impact':{'source':'other','crop':[0,0,3,3]}},
                'pages':{'p0':['muzzle_0','muzzle_1'],'p1':['impact']},
                'animations':{'muzzle':{'frames':['muzzle_0','muzzle_1'],'ticks':[2,3],'loop':False}}}}}
        self.write_spec()
        with patch.object(builder,'load_sources',return_value={'fixture':self.sheet,'other':other}):
            outputs, report = builder.prepare(self.manifest)
        builder.commit(outputs,report,self.root/'v2-report.json')
        runtime=json.loads((self.root/'public/assets/fx/beckman/fx-runtime.json').read_bytes())
        self.assertEqual(runtime['framePages'],{'muzzle_0':'p0','muzzle_1':'p0','impact':'p1'})
        self.assertEqual(runtime['anims']['muzzle']['ticks'],[2,3])
        originals={'muzzle_0':self.sheet.crop((0,0,3,3)),'muzzle_1':self.sheet.crop((3,0,6,3)),'impact':other}
        for page in runtime['pages']:
            folder=self.root/'public/assets/fx/beckman'
            atlas=json.loads((folder/page['data']).read_bytes())
            with Image.open(folder/page['image']) as image:
                for name, entry in atlas['frames'].items():
                    x,y,w,h=(entry['frame'][k] for k in ('x','y','w','h'))
                    self.assertEqual(image.crop((x,y,x+w,y+h)).tobytes(),originals[name].tobytes())
        self.assertEqual(len(report['catalogs']),2)
        self.assertEqual(set(report['sources']),{'fixture','other'})

    def test_schema_two_rejects_unknown_sources_duplicate_crops_and_invalid_timing(self):
        self.config={'schemaVersion':2,'catalog':'catalog.json','characters':{'kizaru':{
            'frames':{'beam_0':{'source':'fixture','crop':[0,0,3,3]},'impact':{'source':'missing','crop':[3,0,3,3]}}}}}
        self.write_spec()
        with self.assertRaisesRegex(ValueError,'unknown explicit source'):self.prepare_fixture()
        entry=self.config['characters']['kizaru']; entry['frames']['impact']['source']='fixture'
        entry['frames']['impact']['crop']=[0,0,3,3]
        self.write_spec()
        with self.assertRaisesRegex(ValueError,'duplicate crop'):self.prepare_fixture()
        entry['frames']['impact']['crop']=[3,0,3,3]
        entry['animations']={'beam':{'frames':['beam_0','absent'],'ticks':[1,0],'loop':False}}
        self.write_spec()
        with self.assertRaisesRegex(ValueError,'positive per-frame ticks'):self.prepare_fixture()
        entry['animations']['beam']={'frames':['beam_0'],'ticks':[1],'loop':False}
        entry['pages']={'p0':['beam_0']}
        self.write_spec()
        with self.assertRaisesRegex(ValueError,'every frame exactly once'):self.prepare_fixture()

    def test_rejects_catalog_record_conflicts_and_sources_without_visual_review(self):
        (self.root/'other.json').write_text(json.dumps({'sources':{'fixture':{
            'adoptionStatus':'unreviewed','sha256':'1'*64}}}))
        self.config.pop('catalog'); self.config['catalogs']=['catalog.json','other.json']
        self.write_spec()
        with self.assertRaisesRegex(ValueError,'Conflicting source catalog record'):self.prepare_fixture()
        self.config['catalogs']=['other.json']
        self.write_spec()
        with self.assertRaisesRegex(ValueError,'explicit visual review'):self.prepare_fixture()

if __name__=='__main__':unittest.main()
