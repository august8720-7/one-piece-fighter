import type { AiProfile } from '../../ai/types';

/** 仅由Cpu编译成经典输入，不改战斗状态。 */
export const gabanAi: AiProfile = {
  "closeRange": 70,
  "midRange": 146,
  "far": [
    {
      "weight": 5,
      "action": {
        "kind": "run",
        "frames": 18
      }
    },
    {
      "weight": 3,
      "action": {
        "kind": "walk",
        "dir": 1,
        "frames": 14
      }
    },
    {
      "weight": 2,
      "action": {
        "kind": "jump",
        "dir": 1,
        "attack": "C"
      }
    }
  ],
  "mid": [
    {
      "weight": 5,
      "action": {
        "kind": "special",
        "motion": "236",
        "button": "P",
        "cooldown": 88
      }
    },
    {
      "weight": 3,
      "action": {
        "kind": "special",
        "motion": "22",
        "button": "P",
        "cooldown": 132
      }
    },
    {
      "weight": 2,
      "action": {
        "kind": "walk",
        "dir": 1,
        "frames": 9
      }
    },
    {
      "weight": 2,
      "action": {
        "kind": "block",
        "frames": 16,
        "low": true
      }
    }
  ],
  "close": [
    {
      "weight": 5,
      "action": {
        "kind": "normal",
        "stance": "stand",
        "button": "A"
      }
    },
    {
      "weight": 4,
      "action": {
        "kind": "special",
        "motion": "214",
        "button": "P",
        "cooldown": 96
      }
    },
    {
      "weight": 2,
      "action": {
        "kind": "throw"
      }
    },
    {
      "weight": 3,
      "action": {
        "kind": "block",
        "frames": 16,
        "low": true
      }
    },
    {
      "weight": 3,
      "action": {
        "kind": "special",
        "motion": "214",
        "button": "K",
        "cooldown": 132
      }
    }
  ],
  "antiAir": [
    {
      "weight": 5,
      "action": {
        "kind": "special",
        "motion": "623",
        "button": "P",
        "cooldown": 104
      }
    },
    {
      "weight": 2,
      "action": {
        "kind": "normal",
        "stance": "crouch",
        "button": "C"
      }
    }
  ],
  "projectileAnswer": [
    {
      "weight": 4,
      "action": {
        "kind": "roll",
        "dir": 1
      }
    },
    {
      "weight": 3,
      "action": {
        "kind": "block",
        "frames": 21
      }
    },
    {
      "weight": 2,
      "action": {
        "kind": "jump",
        "dir": 1,
        "attack": "C"
      }
    }
  ],
  "okizeme": [
    {
      "weight": 3,
      "action": {
        "kind": "special",
        "motion": "22",
        "button": "P",
        "cooldown": 142
      }
    },
    {
      "weight": 2,
      "action": {
        "kind": "walk",
        "dir": 1,
        "frames": 8
      }
    },
    {
      "weight": 2,
      "action": {
        "kind": "wait",
        "frames": 9
      }
    }
  ],
  "punish": [
    {
      "weight": 4,
      "action": {
        "kind": "special",
        "motion": "236",
        "button": "P"
      }
    },
    {
      "weight": 3,
      "action": {
        "kind": "normal",
        "stance": "stand",
        "button": "C"
      }
    },
    {
      "weight": 2,
      "action": {
        "kind": "special",
        "motion": "236236",
        "button": "P",
        "minMeter": 100
      }
    }
  ],
  "followups": [
    {
      "from": [
        "st_a",
        "cr_a"
      ],
      "options": [
        {
          "weight": 4,
          "action": {
            "kind": "normal",
            "stance": "stand",
            "button": "C"
          }
        },
        {
          "weight": 2,
          "action": {
            "kind": "normal",
            "stance": "crouch",
            "button": "D"
          }
        }
      ]
    },
    {
      "from": [
        "st_c",
        "f_c"
      ],
      "options": [
        {
          "weight": 3,
          "action": {
            "kind": "special",
            "motion": "236",
            "button": "P"
          }
        },
        {
          "weight": 2,
          "action": {
            "kind": "special",
            "motion": "214",
            "button": "P"
          }
        }
      ]
    }
  ]
};
