/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/athlete_proof.json`.
 */
export type AthleteProof = {
  "address": "2uX6mMi35SdGfBCfJidEnjRjTo1cXAVEQGeJdtrm1up7",
  "metadata": {
    "name": "athleteProof",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "AthleteTwin onchain training proof program"
  },
  "instructions": [
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
