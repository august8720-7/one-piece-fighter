"""Summarize already captured IAB evidence; no browser control, game writes or tests."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OWN=Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/shanks')
EVIDENCE=OWN.parent/'iab-game'

def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def ref(path):return {'file':path.as_posix(),'sha256':sha(path),'bytes':path.stat().st_size}
def fighter(row):return {k:row[k] for k in ('characterId','state','moveId','stateFrame','facing','position','hp')}

def main():
    assert ROOT==Path('D:/Projects/one-piece-fighter') and Path.cwd().resolve()==ROOT
    cases=[]
    specs=[('center','中心路飞','shanks-center-after1013.json','shanks-center-grip-live1013.jpg',None,'right'),
           ('right_large','右侧大体型/根记录推到右墙','shanks-right-large-after1013.json','shanks-right-large-grip1013.jpg','shanks-right-large-before1013.json','right'),
           ('left_small','左墙反向LABUBU','shanks-left-small-after1013.json','shanks-left-small-grip1013.jpg','shanks-left-small-before1013.json','left')]
    for id_,label,after_name,image_name,before_name,grip_side in specs:
        path=EVIDENCE/after_name;data=read(path)
        hits=[x for x in data['hits'] if x['moveId']=='throw_back']
        start=next(x for x in hits if x['kind']=='throw' and x['damage']==0)
        hit=next(x for x in hits if x['kind']=='hit' and x['damage']==114)
        caster=data['fighters'][start['attacker']];victim=data['fighters'][start['defender']]
        assert caster['characterId']=='shanks' and caster['moveId']=='throw_back'
        assert victim['state']=='hit_air' and hit['frame']-start['frame']==21
        hp_before=start['hpAfterStep'][start['defender']];hp_after=hit['hpAfterStep'][start['defender']]
        assert hp_before-hp_after==114
        relative=victim['position']['x']-caster['position']['x'];release_side='left' if relative<0 else 'right'
        assert release_side != grip_side
        before=read(EVIDENCE/before_name) if before_name else None
        case={'id':id_,'label':label,'afterEvidence':ref(path),'gripImage':ref(EVIDENCE/image_name),
          'imageActuallyInspected':True,'visualReviewer':'Shanks agent, actual view_image inspection of the saved screenshot',
          'visualObservation':{'gripOnActualAnkleFoot':True,'casterSingleVisibleArm':True,'facesVisible':True,
                               'noObviousEmptyGripOrForegroundResidueAtCapturedHold':True,'victimSideWhileHeld':grip_side},
          'mode':data['mode'],'savedAfterFrame':data['frame'],'throwEvent':start,'damageEvent':hit,
          'observedReleaseTickDifference':hit['frame']-start['frame'],'observedDamage':hit['damage'],
          'hpFromActualEvents':{'before':hp_before,'after':hp_after},'casterAfter':fighter(caster),'victimAfter':fighter(victim),
          'victimRelativeXAfter':relative,'victimSideAfterRelease':release_side,'sideChangeSupportedByGripImageAndAfterState':True,
          'liveHoldingRootDistance':None,'liveHoldingRootDistanceNote':'No exact holding-position JSON was supplied; do not invent measured30 from config.',
          'beforeSnapshot':{'evidence':ref(EVIDENCE/before_name),'frame':before['frame'],'fighters':[fighter(x) for x in before['fighters']]} if before else None,
          'audioState':{'state':data['audio']['state'],'contextState':data['audio']['contextState'],'paused':data['audio']['paused'],
                        'playbackError':data['audio']['playbackError'],'musicInstances':data['audio']['music']['instances']},
          'sampleAbilityIssues':data.get('sampleAbilityIssues',[])}
        if id_=='right_large':
            case['wallEvidenceBoundary']={'controllerReportedInput':'Root reports an additional D2500 push to the right wall after the saved before snapshot.',
                'immediatePreThrowCoordinates':None,'savedBeforeWasPriorToFinalPush':True,
                'confirmedPostReleaseCasterX':478.61328125,
                'note':'Saved before values352.578125/385.578125 are earlier setup, not right-wall throw coordinates. Screenshot confirms grasp; no exact immediate wall-start coordinates fabricated.'}
        elif id_=='left_small':
            case['wallEvidenceBoundary']={'savedBeforeVictimX':-512,'savedBeforeCasterX':-480,
                'savedBeforeFrame':before['frame'],'immediatePreThrowCoordinates':None,
                'note':'These are actual saved before values, not a continuous per-tick position trace.'}
        cases.append(case)
    result={'status':'shanks-back-throw-targeted-IAB-evidence-reviewed','reviewedAtUtc':datetime.now(timezone.utc).isoformat(),
      'activeProjectRoot':ROOT.as_posix(),'executionOwner':'root','executionMethodReportedByRoot':'IAB, 1x real keyboard input; no new execution by reviewer',
      'evidenceScope':'DEV training/sample UI; screenshots visibly show 样板. This proves the targeted back-throw route, not the formal full roster/menu/public release.',
      'cases':cases,'caseCount':3,'allReleaseEventDifferences21':True,'allDamage114':True,'allVictimsReleasedToHitAir':True,
      'allOppositeSidesAfterRelease':True,'oldTechReuse':{'newLiveShanksBackTechExecuted':False,
         'evidence':[ref(ROOT/'docs/assets/首两角前投接续1008.md'),ref(ROOT/'tests/core/firstPairThrowWall1004.test.ts')],
         'boundary':'Reuse unchanged core tech mechanism, historical actual tech and root-reported targeted tests; do not claim new real Shanks back-throw tech was performed.'},
      'noNewTestsOrBrowserRuns':True,'centralStateWritten':False,'formalRosterAccepted':False,'newCompleteCharacters':0,
      'voiceQualityOrNewJapaneseAdoptionCertifiedByThisReview':False}
    with (OWN/'shanks-backthrow-iab-result1013.json').open('x',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
    print(json.dumps({'cases':3,'tickDifferences':[x['observedReleaseTickDifference'] for x in cases],
                     'damage':[x['observedDamage'] for x in cases],'sideChanges':True,'rightImmediateBeforeKnown':False,'formalRosterAccepted':False}))

if __name__=='__main__':main()
