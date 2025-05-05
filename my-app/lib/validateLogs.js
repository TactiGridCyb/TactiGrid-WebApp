import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

ajv.addFormat('date-time', {
  type: 'string',
  validate: (txt) => !isNaN(Date.parse(txt))
});

/* ── NEW JSON‑SCHEMA that matches the latest Log model ── */
export const trackSchema = {
  type: 'object',
  required: [
    'sessionId', 'operation', 'missionId',
    'StartTime', 'EndTime', 'Duration',
    'intervalMs', 'codec', 'data'
  ],
  additionalProperties: false,
  properties: {
    /* headline */
    sessionId:  { type:'string' },
    operation:  { type:'string' },     // OPERATION REDHAWK
    missionId:  { type:'string' },     // ABC123

    /* timing */
    StartTime:  { type:'string', format:'date-time' },
    EndTime:    { type:'string', format:'date-time' },
    Duration: {
      type: 'integer',     
      minimum: 1           
    },

    /* meta */
    LogFiles: { type:'array', items:{ type:'string' } },
    GMK:      { type:'string' },
    Soldiers: { type:'array',
      items:{
        type:'object',
        required:['id','callsign'],
        additionalProperties:false,
        properties:{
          id:{type:'string'},
          callsign:{type:'string'}
        }
      }
    },
    Location: {
      type:'object',
      required:['name','bbox'],
      additionalProperties:false,
      properties:{
        name:{type:'string'},
        bbox:{
          type:'array', items:{type:'number'},
          minItems:4, maxItems:4
        }
      }
    },
    ConfigID: { type:'string' },

    /* codec / interval */
    intervalMs:{ type:'integer', minimum:1 },
    codec:{
      type:'object',
      required:['path','hr','compression'],
      additionalProperties:false,
      properties:{
        path:{ const:'polyline' },
        hr:{ enum:['delta-varint','delta'] },
        compression:{ const:'brotli' }
      }
    },

    /* NEW telemetry array */
    data:{
      type:'array',
      minItems:1,
      items:{
        type:'object',
        required:['soldierId','latitude','longitude','heartRate','time_sent'],
        additionalProperties:false,
        properties:{
          soldierId:{ type:'string' },
          latitude: { type:'number' },
          longitude:{ type:'number' },
          heartRate:{ type:'integer', minimum:0 },
          time_sent:{ type:'string', format:'date-time' }
        }
      }
    },

    /* optional replay blob */
    blob:{ instanceof:'Buffer' }
  }
};

export const validateTrack = ajv.compile(trackSchema);
