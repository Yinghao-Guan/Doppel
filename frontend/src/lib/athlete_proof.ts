/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/athlete_proof.json`.
 */
export type AthleteProof = {
  "address": "A6KXpSqEwEUJyQwFcgM2fSptHjmXHUMyijb2ihAc2hjd",
  "metadata": {
    "name": "athleteProof",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "AthleteTwin onchain training proof program"
  },
  "instructions": [
    {
      "name": "claimBadge",
      "docs": [
        "Record a badge claim on-chain. The PDA guarantees a wallet can only claim",
        "a given badge id once, while the config gates claims behind the backend authority."
      ],
      "discriminator": [
        111,
        30,
        18,
        17,
        228,
        252,
        239,
        102
      ],
      "accounts": [
        {
          "name": "badgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  100,
                  103,
                  101,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "badgeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  100,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "badgeId"
              }
            ]
          }
        },
        {
          "name": "owner"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "badgeId",
          "type": "string"
        },
        {
          "name": "badgeMint",
          "type": "pubkey"
        },
        {
          "name": "metadataUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "initializeBadgeConfig",
      "docs": [
        "Create the singleton badge config that authorizes server-side badge claims."
      ],
      "discriminator": [
        88,
        185,
        214,
        49,
        51,
        213,
        26,
        150
      ],
      "accounts": [
        {
          "name": "badgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  100,
                  103,
                  101,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeProfile",
      "docs": [
        "Create an on-chain profile for a new athlete wallet."
      ],
      "discriminator": [
        32,
        145,
        77,
        213,
        58,
        39,
        251,
        234
      ],
      "accounts": [
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "submitTrainingProof",
      "docs": [
        "Submit a verifiable training proof on-chain."
      ],
      "discriminator": [
        168,
        204,
        17,
        231,
        11,
        17,
        94,
        237
      ],
      "accounts": [
        {
          "name": "proof",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  111,
                  102
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "profile.total_workouts",
                "account": "athleteProfile"
              }
            ]
          }
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "exerciseType",
          "type": "string"
        },
        {
          "name": "reps",
          "type": "u16"
        },
        {
          "name": "formScore",
          "type": "u8"
        },
        {
          "name": "predictionScore",
          "type": "u8"
        },
        {
          "name": "proofHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "athleteProfile",
      "discriminator": [
        197,
        244,
        74,
        34,
        28,
        55,
        104,
        82
      ]
    },
    {
      "name": "badgeAccount",
      "discriminator": [
        196,
        11,
        9,
        188,
        135,
        107,
        36,
        226
      ]
    },
    {
      "name": "badgeConfig",
      "discriminator": [
        118,
        207,
        243,
        185,
        139,
        238,
        159,
        60
      ]
    },
    {
      "name": "trainingProof",
      "discriminator": [
        198,
        94,
        188,
        184,
        98,
        160,
        13,
        222
      ]
    }
  ],
  "events": [
    {
      "name": "badgeClaimed",
      "discriminator": [
        11,
        176,
        119,
        121,
        7,
        255,
        229,
        74
      ]
    },
    {
      "name": "proofSubmitted",
      "discriminator": [
        160,
        51,
        85,
        70,
        249,
        89,
        5,
        139
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidScore",
      "msg": "Score must be between 0 and 100."
    },
    {
      "code": 6001,
      "name": "exerciseTypeTooLong",
      "msg": "Exercise type must be 32 characters or fewer."
    },
    {
      "code": 6002,
      "name": "unauthorized",
      "msg": "Signer does not own this profile."
    },
    {
      "code": 6003,
      "name": "badgeIdTooLong",
      "msg": "Badge id must be 32 characters or fewer."
    },
    {
      "code": 6004,
      "name": "metadataUriTooLong",
      "msg": "Metadata URI must be 200 characters or fewer."
    },
    {
      "code": 6005,
      "name": "unauthorizedBadgeAuthority",
      "msg": "Signer is not the authorized badge authority."
    }
  ],
  "types": [
    {
      "name": "athleteProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "totalWorkouts",
            "type": "u32"
          },
          {
            "name": "bestFormScore",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "badgeAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "badgeId",
            "type": "string"
          },
          {
            "name": "badgeMint",
            "type": "pubkey"
          },
          {
            "name": "metadataUri",
            "type": "string"
          },
          {
            "name": "claimedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "badgeClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "badgeId",
            "type": "string"
          },
          {
            "name": "badgeMint",
            "type": "pubkey"
          },
          {
            "name": "metadataUri",
            "type": "string"
          },
          {
            "name": "claimedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "badgeConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "proofSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "exerciseType",
            "type": "string"
          },
          {
            "name": "reps",
            "type": "u16"
          },
          {
            "name": "formScore",
            "type": "u8"
          },
          {
            "name": "predictionScore",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "trainingProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "exerciseType",
            "type": "string"
          },
          {
            "name": "reps",
            "type": "u16"
          },
          {
            "name": "formScore",
            "type": "u8"
          },
          {
            "name": "predictionScore",
            "type": "u8"
          },
          {
            "name": "proofHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
