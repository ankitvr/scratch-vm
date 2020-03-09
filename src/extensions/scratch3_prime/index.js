const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const color = require('../../util/color');
const MathUtil = require('../../util/math-util');
const log = require('../../util/log');

const PrimeHub = require('./prime-hub.js');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const iconURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA0JJREFUeNrs2YFtozAUgGESdQBG4DagE5RskA0umSDpBE0myN0E9CZoOgHpBJcNwgZhgxycjIRc29iASZD+T7LuIlFi+8HzsxMEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPDQZpbXJdLnE1M3bkDCsq3K9rNsseaavGzHsv0W/zc5GO6j8lW2Qtw/d7zvQvoci+ua/pTtvaUPqr+rvZbt3PicDRALbZ+qjlzKdrNsVxE8k8zhfnI7iAfE9r6qt1u+ZmcRjKumP6qx3gZo//s0V3SkGmTkENlqslKLoHS1HegJtFXPgeohWFu8Wb3MFSlA1ZFCrBsnQwo5OAbSdZJ2IwSjfrjuEozKkzToRBGIV0VHqon/kPJ3NYiNuN7GQjMhL+Jtkydl4zkooXgz4gGCcXaYh+aa/C012OTL5gDkPPu3R663yeGJpzUkFH1X5fatxWTKf5MNkbJ0qUqnUJS/8UBPa/WE7S3Kb99vRvVW/Bqz7J23TP6bocKpy78q9TyLEno2YN/OI81BagjGeux9yFPLZq8ugav9wKf4V857uae+RSMFY/kowZADchZBSTSbxFUjcF8iOL6e4rpA8PnW6Er1YoBgRI4FyEl3+mHaEKnaRXxx2GFjqBvIUrPAXhXf03VRbxujazU3yKbQVOFcHG/YtlvPPHW6a0BsxhPdIyBzTVp4FlVO7pBifO7Wz573IIVmPHddQ+QO7kRbis1aYlHWpi27+S6OnhfYd3GwlynerG3HsjcX93RZQzovtisx8bo8nPZMWRdxvc0Jcd+UlUoPk8265XVjOMS5j2pC++7UbfUJSKooKFQP2cc9ApKIDmaNCsd2UbtYTMqjBUR3xLPTBG859tFJnYqa68TSIV9OzachILlmbQzH6NjcsOHaWHQiUmwkpxigprUmPb+NGZBcsdJHgfnHqkiTX08TD4hu17wN/BxuasveveIL601ifVxSezF0bh9M31pTnFSp64flmtxlnfx2OHvwdATwaIu6zSZz5zDG20BN6RAMfx4zxYCEhiOk2FdAVEcn9W8cR4ed9CIY5zfvMRWG9OvtWGVmmQ9jqeLKNYUAAAAAAAAAAAAAAAAAAAAAAAAAAACYhn8CDABXMSsUjYDqrQAAAABJRU5ErkJggg==';

/**
 * Enum for vision sensor colors.
 * @readonly
 * @enum {string}
 */
const PrimeColor = {
    ANY: 'any',
    NONE: 'none',
    VIOLET: 'violet',
    AZURE: 'azure',
    RED: 'red',
    BLUE: 'blue',
    GREEN: 'green',
    YELLOW: 'yellow',
    BLACK: 'black',
    WHITE: 'white'
};

/**
 * Enum for indexed colors read by the Prime Color Sensor
 * @readonly
 * @enum {number}
 */
const PrimeColorIndex = {
    [PrimeColor.NONE]: -1,
    [PrimeColor.BLACK]: 0,
    [PrimeColor.VIOLET]: 1,
    [PrimeColor.BLUE]: 3,
    [PrimeColor.AZURE]: 4,
    [PrimeColor.GREEN]: 5,
    [PrimeColor.YELLOW]: 7,
    [PrimeColor.RED]: 9,
    [PrimeColor.WHITE]: 10
};

const PrimeGesture = {
    SHAKE: 'shake',
    TAPPED: 'tapped',
    DOUBLETAPPED: 'doubletapped',
    FREEFALL: 'freefall',
    ANY: 'any'
};

/**
 * Enum for motor specification.
 * @readonly
 * @enum {string}
 */
const PrimeMotorLabel = {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
    F: 'F',
    ALL: 'all motors'
};

/**
 * Enum for motor direction specification.
 * @readonly
 * @enum {string}
 */
const PrimeMotorDirection = {
    FORWARD: 'this way',
    BACKWARD: 'that way',
    REVERSE: 'reverse'
};

/**
 * Enum for tilt sensor direction.
 * @readonly
 * @enum {string}
 */
const PrimeTiltDirection = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right',
    ANY: 'any'
};

/**
 * Scratch 3.0 blocks to interact with a LEGO Prime peripheral.
 */
class Scratch3PrimeBlocks {

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID () {
        return 'prime';
    }

    /**
     * @return {number} - the tilt sensor counts as "tilted" if its tilt angle meets or exceeds this threshold.
     */
    static get TILT_THRESHOLD () {
        return 15;
    }

    /**
     * The minimum and maximum MIDI note numbers, for clamping the input to play note.
     * @type {{min: number, max: number}}
     */
    static get MIDI_NOTE_RANGE () {
        return {min: 10, max: 120};
    }

    /**
     * Construct a set of Prime blocks.
     * @param {Runtime} runtime - the Scratch 3.0 runtime.
     */
    constructor (runtime) {
        /**
         * The Scratch 3.0 runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // Create a new Prime Hub peripheral instance
        this._peripheral = new PrimeHub(this.runtime, Scratch3PrimeBlocks.EXTENSION_ID);

        this._playNoteForPicker = this._playNoteForPicker.bind(this);
        this.runtime.on('PLAY_NOTE', this._playNoteForPicker);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: Scratch3PrimeBlocks.EXTENSION_ID,
            name: 'Prime',
            blockIconURI: iconURI,
            showStatusButton: true,
            blocks: [
                {
                    opcode: 'motorOnFor',
                    text: formatMessage({
                        id: 'Prime.motorOnFor',
                        default: 'turn motor [MOTOR_ID] for [DURATION] seconds',
                        description: 'turn a motor on for some time'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'MOTOR_ID',
                            defaultValue: PrimeMotorLabel.A
                        },
                        DURATION: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'motorOnForRotation',
                    text: formatMessage({
                        id: 'Prime.motorOnForRotation',
                        default: 'turn motor [MOTOR_ID] for [ROTATION] rotations',
                        description: 'turn a motor on for rotation'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'MOTOR_ID',
                            defaultValue: PrimeMotorLabel.A
                        },
                        ROTATION: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'motorOn',
                    text: formatMessage({
                        id: 'Prime.motorOn',
                        default: 'turn motor [MOTOR_ID] on',
                        description: 'turn a motor on indefinitely'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'MOTOR_ID',
                            defaultValue: PrimeMotorLabel.A
                        }
                    }
                },
                {
                    opcode: 'motorOff',
                    text: formatMessage({
                        id: 'Prime.motorOff',
                        default: 'turn motor [MOTOR_ID] off',
                        description: 'turn a motor off'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'MOTOR_ID',
                            defaultValue: PrimeMotorLabel.A
                        }
                    }
                },
                {
                    opcode: 'setMotorPower',
                    text: formatMessage({
                        id: 'Prime.setMotorPower',
                        default: 'set motor [MOTOR_ID] power to [POWER] %',
                        description: 'set the motor\'s power without turning it on'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'MOTOR_ID',
                            defaultValue: PrimeMotorLabel.ALL
                        },
                        POWER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                {
                    opcode: 'setMotorDirection',
                    text: formatMessage({
                        id: 'Prime.setMotorDirection',
                        default: 'set motor [MOTOR_ID] to turn [MOTOR_DIRECTION]',
                        description: 'set the motor\'s turn direction without turning it on'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'MOTOR_ID',
                            defaultValue: PrimeMotorLabel.A
                        },
                        MOTOR_DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'MOTOR_DIRECTION',
                            defaultValue: PrimeMotorDirection.FORWARD
                        }
                    }
                },
                {
                    opcode: 'getMotorPosition',
                    text: formatMessage({
                        id: 'Prime.getMotorPosition',
                        default: 'motor position [MOTOR_REPORTER_ID]',
                        description: 'the position returned by the motor'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        MOTOR_REPORTER_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'MOTOR_REPORTER_ID',
                            defaultValue: PrimeMotorLabel.A
                        }
                    }
                },
                '---',
                {
                    opcode: 'displaySymbol',
                    text: formatMessage({
                        id: 'Prime.displaySymbol',
                        default: 'display [MATRIX]',
                        description: 'display a pattern on the micro:bit display'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MATRIX: {
                            type: ArgumentType.MATRIX,
                            defaultValue: '0101010101100010101000100'
                        }
                    }
                },
                {
                    opcode: 'displayClear',
                    text: formatMessage({
                        id: 'Prime.clearDisplay',
                        default: 'clear display',
                        description: 'display nothing on the micro:bit display'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'playNoteForSeconds',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'Prime.playNoteForSeconds',
                        default: 'beep note [NOTE] for [DURATION] seconds',
                        description: 'beep a note for a number of seconds'
                    }),
                    arguments: {
                        NOTE: {
                            type: ArgumentType.NOTE,
                            defaultValue: 84
                        },
                        DURATION: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.1
                        }
                    }
                },
                {
                    opcode: 'whenColor',
                    text: formatMessage({
                        id: 'Prime.whenColor',
                        default: 'when color [COLOR]',
                        description: 'check for when color'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        COLOR: {
                            type: ArgumentType.STRING,
                            menu: 'COLOR',
                            defaultValue: PrimeColor.ANY
                        }
                    }
                },
                {
                    opcode: 'getColor',
                    text: formatMessage({
                        id: 'Prime.getColor',
                        default: 'color',
                        description: 'the color returned by the vision sensor'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getForce',
                    text: formatMessage({
                        id: 'Prime.getForce',
                        default: 'force',
                        description: 'the force returned by the force sensor'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getDistance',
                    text: formatMessage({
                        id: 'Prime.getDistance',
                        default: 'distance',
                        description: 'the distance returned by the ultrasonic sensor'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'whenTilted',
                    text: formatMessage({
                        id: 'Prime.whenTilted',
                        default: 'when tilted [TILT_DIRECTION_ANY]',
                        description: 'check when tilted in a certain direction'
                    }),
                    func: 'isTilted',
                    blockType: BlockType.HAT,
                    arguments: {
                        TILT_DIRECTION_ANY: {
                            type: ArgumentType.STRING,
                            menu: 'TILT_DIRECTION_ANY',
                            defaultValue: PrimeTiltDirection.ANY
                        }
                    }
                },
                {
                    opcode: 'whenGesture',
                    text: formatMessage({
                        id: 'Prime.whenGesture',
                        default: 'when gesture [GESTURE_ANY]',
                        description: 'check when a certain gesture has been performed with the hub'
                    }),
                    func: 'isGesture',
                    blockType: BlockType.HAT,
                    arguments: {
                        GESTURE_ANY: {
                            type: ArgumentType.STRING,
                            menu: 'GESTURE_ANY',
                            defaultValue: PrimeGesture.ANY
                        }
                    }
                },
                {
                    opcode: 'isTilted',
                    text: formatMessage({
                        id: 'Prime.isTilted',
                        default: 'tilted [TILT_DIRECTION_ANY]?',
                        description: 'whether the tilt sensor is tilted'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        TILT_DIRECTION_ANY: {
                            type: ArgumentType.STRING,
                            menu: 'TILT_DIRECTION_ANY',
                            defaultValue: PrimeTiltDirection.ANY
                        }
                    }
                },
                {
                    opcode: 'getTiltAngle',
                    text: formatMessage({
                        id: 'Prime.getTiltAngle',
                        default: 'tilt angle [TILT_DIRECTION]',
                        description: 'the angle returned by the tilt sensor'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TILT_DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'TILT_DIRECTION',
                            defaultValue: PrimeTiltDirection.UP
                        }
                    }
                }
                // {
                //     opcode: 'getYaw',
                //     text: formatMessage({
                //         id: 'Prime.getYaw',
                //         default: 'direction',
                //         description: 'the yaw angle reported by the hub'
                //     }),
                //     blockType: BlockType.REPORTER
                // }
                /* ,
                {
                    opcode: 'setLightHue',
                    text: formatMessage({
                        id: 'Prime.setLightHue',
                        default: 'set light color to [HUE]',
                        description: 'set the LED color'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        HUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50
                        }
                    }
                },
                {
                    opcode: 'changeLightHueBy',
                    text: formatMessage({
                        id: 'Prime.changeLightHueBy',
                        default: 'change light color by [HUE]',
                        description: 'change the LED color by a given amount'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        HUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                }*/
            ],
            menus: {
                MOTOR_ID: [
                    {
                        text: formatMessage({
                            id: 'Prime.motorId.a',
                            default: 'A',
                            description: 'label for motor A element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorLabel.A
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorId.b',
                            default: 'B',
                            description: 'label for motor B element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorLabel.B
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorId.c',
                            default: 'C',
                            description: 'label for motor C element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorLabel.C
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorId.d',
                            default: 'D',
                            description: 'label for motor D element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorLabel.D
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorReporterId.e',
                            default: 'E',
                            description: 'label for motor E element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorLabel.E
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorReporterId.f',
                            default: 'F',
                            description: 'label for motor F element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorLabel.F
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorId.all',
                            default: 'all motors',
                            description: 'label for all motors element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorLabel.ALL
                    }
                ],
                MOTOR_REPORTER_ID: [
                    {
                        text: formatMessage({
                            id: 'Prime.motorReporterId.a',
                            default: 'A',
                            description: 'label for motor A element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimePort.A
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorReporterId.b',
                            default: 'B',
                            description: 'label for motor B element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimePort.B
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorReporterId.c',
                            default: 'C',
                            description: 'label for motor C element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimePort.C
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorReporterId.d',
                            default: 'D',
                            description: 'label for motor D element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimePort.D
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorReporterId.e',
                            default: 'E',
                            description: 'label for motor E element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimePort.E
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorReporterId.f',
                            default: 'F',
                            description: 'label for motor F element in motor menu for LEGO Prime extension'
                        }),
                        value: PrimePort.F
                    }
                ],
                MOTOR_DIRECTION: [
                    {
                        text: formatMessage({
                            id: 'Prime.motorDirection.forward',
                            default: 'this way',
                            description: 'label for forward element in motor direction menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorDirection.FORWARD
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorDirection.backward',
                            default: 'that way',
                            description: 'label for backward element in motor direction menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorDirection.BACKWARD
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.motorDirection.reverse',
                            default: 'reverse',
                            description: 'label for reverse element in motor direction menu for LEGO Prime extension'
                        }),
                        value: PrimeMotorDirection.REVERSE
                    }
                ],
                TILT_DIRECTION: [
                    {
                        text: formatMessage({
                            id: 'Prime.tiltDirection.up',
                            default: 'up',
                            description: 'label for up element in tilt direction menu for LEGO Prime extension'
                        }),
                        value: PrimeTiltDirection.UP
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.tiltDirection.down',
                            default: 'down',
                            description: 'label for down element in tilt direction menu for LEGO Prime extension'
                        }),
                        value: PrimeTiltDirection.DOWN
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.tiltDirection.left',
                            default: 'left',
                            description: 'label for left element in tilt direction menu for LEGO Prime extension'
                        }),
                        value: PrimeTiltDirection.LEFT
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.tiltDirection.right',
                            default: 'right',
                            description: 'label for right element in tilt direction menu for LEGO Prime extension'
                        }),
                        value: PrimeTiltDirection.RIGHT
                    }
                ],
                TILT_DIRECTION_ANY: [
                    {
                        text: formatMessage({
                            id: 'Prime.tiltDirection.up',
                            default: 'up'
                        }),
                        value: PrimeTiltDirection.UP
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.tiltDirection.down',
                            default: 'down'
                        }),
                        value: PrimeTiltDirection.DOWN
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.tiltDirection.left',
                            default: 'left'
                        }),
                        value: PrimeTiltDirection.LEFT
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.tiltDirection.right',
                            default: 'right'
                        }),
                        value: PrimeTiltDirection.RIGHT
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.tiltDirection.any',
                            default: 'any',
                            description: 'label for any element in tilt direction menu for LEGO Prime extension'
                        }),
                        value: PrimeTiltDirection.ANY
                    }
                ],
                GESTURE_ANY: [
                    {
                        text: formatMessage({
                            id: 'Prime.gesture.shake',
                            default: 'shake'
                        }),
                        value: PrimeGesture.SHAKE
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.gesture.tap',
                            default: 'tap'
                        }),
                        value: PrimeGesture.TAP
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.gesture.doubletap',
                            default: 'doubletap'
                        }),
                        value: PrimeGesture.DOUBLETAPPED
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.gesture.freefall',
                            default: 'freefall'
                        }),
                        value: PrimeGesture.FREEFALL
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.gesture.any',
                            default: 'any',
                            description: 'label for any element in gesture menu for LEGO Prime extension'
                        }),
                        value: PrimeGesture.ANY
                    }
                ],
                COLOR: [
                    {
                        text: formatMessage({
                            id: 'Prime.color.red',
                            default: 'red',
                            description: 'the color red'
                        }),
                        value: PrimeColor.RED
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.color.blue',
                            default: 'blue',
                            description: 'the color blue'
                        }),
                        value: PrimeColor.BLUE
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.color.violet',
                            default: 'violet',
                            description: 'the color violet'
                        }),
                        value: PrimeColor.VIOLET
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.color.azure',
                            default: 'azure',
                            description: 'the color azure'
                        }),
                        value: PrimeColor.AZURE
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.color.green',
                            default: 'green',
                            description: 'the color green'
                        }),
                        value: PrimeColor.GREEN
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.color.yellow',
                            default: 'yellow',
                            description: 'the color yellow'
                        }),
                        value: PrimeColor.YELLOW
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.color.white',
                            default: 'white',
                            desription: 'the color white'
                        }),
                        value: PrimeColor.WHITE
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.color.black',
                            default: 'black',
                            description: 'the color black'
                        }),
                        value: PrimeColor.BLACK
                    },
                    {
                        text: formatMessage({
                            id: 'Prime.color.any',
                            default: 'any',
                            description: 'any color'
                        }),
                        value: PrimeColor.ANY
                    }
                ],
                OP: ['<', '>']
            }
        };
    }

    /**
     * Turn specified motor(s) on for a specified duration.
     * @param {object} args - the block's arguments.
     * @property {MotorID} MOTOR_ID - the motor(s) to activate.
     * @property {int} DURATION - the amount of time to run the motors.
     * @return {Promise} - a promise which will resolve at the end of the duration.
     */
    motorOnFor (args) {
        // TODO: cast args.MOTOR_ID?
        let durationMS = Cast.toNumber(args.DURATION) * 1000;
        durationMS = MathUtil.clamp(durationMS, 0, 15000);
        return new Promise(resolve => {
            this._forEachMotor(args.MOTOR_ID, motorIndex => {
                const motor = this._peripheral.motor(motorIndex);
                if (motor) {
                    motor.turnOnFor(durationMS);
                }
            });

            // Run for some time even when no motor is connected
            setTimeout(resolve, durationMS);
        });
    }

    /**
     * Turn specified motor(s) on for a specified rotation in full rotations.
     * @param {object} args - the block's arguments.
     * @property {MotorID} MOTOR_ID - the motor(s) to activate.
     * @property {int} ROTATION - the amount of full rotations to turn the motors.
     * @return {Promise} - a promise which will resolve at the end of the duration.
     */
    motorOnForRotation (args) {
        // todo: block should bail out if no motor is connected
        // TODO: cast args.MOTOR_ID?
        // let degrees = Cast.toNumber(args.ROTATION) * 360;
        // TODO: Clamps to 100 rotations. Consider changing.
        const sign = Math.sign(args.ROTATION);
        const rotations = Math.abs(MathUtil.clamp(args.ROTATION, -100, 100));
        return new Promise(resolve => {
            this._forEachMotor(args.MOTOR_ID, motorIndex => {
                const motor = this._peripheral.motor(motorIndex);
                if (motor) {
                    const id = motor.turnOnForRotation(rotations, sign);
                    this._peripheral.motor(motorIndex).pendingPromiseId = id;
                    this._peripheral.motor(motorIndex).pendingPromiseFunction = resolve;
                }
            });
        });
    }

    sendIntervalPromise () {
        return new Promise(resolve => {
            window.setTimeout(() => {
                resolve();
            }, this._peripheral.sendInterval);
        });
    }

    /**
     * Turn specified motor(s) on indefinitely.
     * @param {object} args - the block's arguments.
     * @property {MotorID} MOTOR_ID - the motor(s) to activate.
     * @return {Promise} - a Promise that resolves after some delay.
     */
    motorOn (args) {
        // TODO: cast args.MOTOR_ID?
        this._forEachMotor(args.MOTOR_ID, motorIndex => {
            const motor = this._peripheral.motor(motorIndex);
            if (motor) {
                motor.turnOn();
            }
        });

        return this.sendIntervalPromise();
    }

    /**
     * Turn specified motor(s) off.
     * @param {object} args - the block's arguments.
     * @property {MotorID} MOTOR_ID - the motor(s) to deactivate.
     * @return {Promise} - a Promise that resolves after some delay.
     */
    motorOff (args) {
        // TODO: cast args.MOTOR_ID?
        this._forEachMotor(args.MOTOR_ID, motorIndex => {
            const motor = this._peripheral.motor(motorIndex);
            if (motor) {
                motor.turnOff();
            }
        });

        return this.sendIntervalPromise();
    }

    /**
     * Set the power level of the specified motor(s).
     * @param {object} args - the block's arguments.
     * @property {MotorID} MOTOR_ID - the motor(s) to be affected.
     * @property {int} POWER - the new power level for the motor(s).
     * @return {Promise} - a Promise that resolves after some delay.
     */
    setMotorPower (args) {
        // TODO: cast args.MOTOR_ID?
        this._forEachMotor(args.MOTOR_ID, motorIndex => {
            const motor = this._peripheral.motor(motorIndex);
            if (motor) {
                motor.power = MathUtil.clamp(Cast.toNumber(args.POWER), 0, 100);
            }
        });

        return this.sendIntervalPromise();
    }

    /**
     * Set the direction of rotation for specified motor(s).
     * If the direction is 'reverse' the motor(s) will be reversed individually.
     * @param {object} args - the block's arguments.
     * @property {MotorID} MOTOR_ID - the motor(s) to be affected.
     * @property {MotorDirection} MOTOR_DIRECTION - the new direction for the motor(s).
     * @return {Promise} - a Promise that resolves after some delay.
     */
    setMotorDirection (args) {
        // TODO: cast args.MOTOR_ID?
        this._forEachMotor(args.MOTOR_ID, motorIndex => {
            const motor = this._peripheral.motor(motorIndex);
            if (motor) {
                switch (args.MOTOR_DIRECTION) {
                case PrimeMotorDirection.FORWARD:
                    motor.direction = 1;
                    break;
                case PrimeMotorDirection.BACKWARD:
                    motor.direction = -1;
                    break;
                case PrimeMotorDirection.REVERSE:
                    motor.direction = -motor.direction;
                    break;
                default:
                    log.warn(`Unknown motor direction in setMotorDirection: ${args.DIRECTION}`);
                    break;
                }
                // keep the motor on if it's running, and update the pending timeout if needed
                /* if (motor.isOn) {
                    if (motor.pendingTimeoutDelay) {
                        motor.turnOnFor(motor.pendingTimeoutStartTime + motor.pendingTimeoutDelay - Date.now());
                    }
                }*/
            }
        });

        return this.sendIntervalPromise();
    }

    /**
     * Set the LED's hue.
     * @param {object} args - the block's arguments.
     * @property {number} HUE - the hue to set, in the range [0,100].
     * @return {Promise} - a Promise that resolves after some delay.
     */
    setLightHue (args) {
        // Convert from [0,100] to [0,360]
        let inputHue = Cast.toNumber(args.HUE);
        inputHue = MathUtil.wrapClamp(inputHue, 0, 100);
        const hue = inputHue * 360 / 100;

        const rgbObject = color.hsvToRgb({h: hue, s: 1, v: 1});

        const rgbDecimal = color.rgbToDecimal(rgbObject);

        this._peripheral._led = inputHue;
        this._peripheral.setLED(rgbDecimal);

        return this.sendIntervalPromise();
    }

    /**
     * Change the LED's hue by a give number.
     * @param {object} args - the block's arguments.
     * @property {number} HUE - the hue to set, in the range [0,100].
     */
    changeLightHueBy (args) {
        // TODO: Clean up this block and its opcode
        const n = {};
        n.HUE = Cast.toNumber(args.HUE) + this._peripheral._led;
        this.setLightHue(n);
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {object} args - the block's arguments.
     * @property {TiltDirection} TILT_DIRECTION_ANY - the tilt direction to test (up, down, left, right, or any).
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     */
    whenTilted (args) {
        return this._isTilted(args.TILT_DIRECTION_ANY);
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {object} args - the block's arguments.
     * @property {TiltDirection} TILT_DIRECTION_ANY - the tilt direction to test (up, down, left, right, or any).
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     */
    whenGesture (args) {
        const bool = this._isGesture(args.GESTURE_ANY);
        if (bool) {
            this._peripheral._sensors.gesture = false;
            return true;
        }
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {object} args - the block's arguments.
     * @property {Color} COLOR - the color to test.
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     */
    whenColor (args) {
        return this._isColor(args.COLOR);
    }

    /**
     * @return {number} - the vision sensor's color value. Indexed LEGO brick colors.
     */
    getColor () {
        // To get a string representation, lookup the key of the PrimeColor-enum value
        return this._peripheral.color;
    }

    /**
     * Test whether the vision sensor is detecting a certain color.
     * @param {number} clr - the color to test.
     * @return {boolean} - true when the color sensor senses the specified color.
     * @private
     */
    _isColor (clr) {
        if (clr === PrimeColor.ANY) {
            if (Object.keys(PrimeColor).find(key => PrimeColor[key])
                .toLowerCase() !== this.getColor()) {
                if (this.getColor() === this._peripheral.oldColor) {
                    return false;
                }
                this._peripheral._sensors.oldColor = this.getColor();
                return true;
            }
        } else {
            return this.getColor() === color.toLowerCase();
        }
    }

    /**
     * @param {object} args - the block's arguments.
     * @return {number} - returns the motor's position.
     */
    getMotorPosition (args) {
        let portID = null;
        switch (args.MOTOR_REPORTER_ID) {
        case PrimeMotorLabel.A:
            portID = PrimePort.A;
            break;
        case PrimeMotorLabel.B:
            portID = PrimePort.B;
            break;
        case PrimeMotorLabel.C:
            portID = PrimePort.C;
            break;
        case PrimeMotorLabel.D:
            portID = PrimePort.D;
            break;
        case PrimeMotorLabel.E:
            portID = PrimePort.E;
            break;
        case PrimeMotorLabel.F:
            portID = PrimePort.F;
            break;
        default:
            log.warn('Asked for a motor position that doesnt exist!');
            return false;
        }
        if (portID !== null && this._peripheral.motor(portID)) {
            return this._peripheral.motor(portID).position;
        }
        return 0;
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {object} args - the block's arguments.
     * @property {TiltDirection} TILT_DIRECTION_ANY - the tilt direction to test (up, down, left, right, or any).
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     */
    isTilted (args) {
        return this._isTilted(args.TILT_DIRECTION_ANY);
    }

    /**
     * @param {object} args - the block's arguments.
     * @property {TiltDirection} TILT_DIRECTION - the direction (up, down, left, right) to check.
     * @return {number} - the tilt sensor's angle in the specified direction.
     * Note that getTiltAngle(up) = -getTiltAngle(down) and getTiltAngle(left) = -getTiltAngle(right).
     */
    getTiltAngle (args) {
        return this._getTiltAngle(args.TILT_DIRECTION);
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {TiltDirection} direction - the tilt direction to test (up, down, left, right, or any).
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     * @private
     */
    _isTilted (direction) {
        switch (direction) {
        case PrimeTiltDirection.ANY:
            return (Math.abs(this._peripheral.tiltX) >= Scratch3PrimeBlocks.TILT_THRESHOLD) ||
                (Math.abs(this._peripheral.tiltY) >= Scratch3PrimeBlocks.TILT_THRESHOLD);
        default:
            return this._getTiltAngle(direction) >= Scratch3PrimeBlocks.TILT_THRESHOLD;
        }
    }

    /**
     * @param {TiltDirection} direction - the direction (up, down, left, right) to check.
     * @return {number} - the tilt sensor's angle in the specified direction.
     * Note that getTiltAngle(up) = -getTiltAngle(down) and getTiltAngle(left) = -getTiltAngle(right).
     * @private
     */
    _getTiltAngle (direction) {
        switch (direction) {
        case PrimeTiltDirection.UP:
            return this._peripheral.tiltY;
        case PrimeTiltDirection.DOWN:
            return -this._peripheral.tiltY;
        case PrimeTiltDirection.LEFT:
            return this._peripheral.tiltX;
        case PrimeTiltDirection.RIGHT:
            return -this._peripheral.tiltX;
        default:
            log.warn(`Unknown tilt direction in _getTiltAngle: ${direction}`);
        }
    }

    getYaw () {
        return this._peripheral.yaw;
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {object} args - the block's arguments.
     * @property {Gesture} GESTURE_ANY - the tilt direction to test (up, down, left, right, or any).
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     */
    isGesture (args) {
        return this._isGesture(args.GESTURE_ANY);
    }

    /**
     * Test whether the tilt sensor is currently tilted.
     * @param {Gesture} gesture - the tilt direction to test (up, down, left, right, or any).
     * @return {boolean} - true if the tilt sensor is tilted past a threshold in the specified direction.
     * @private
     */
    _isGesture (gesture) {
        switch (gesture) {
        case PrimeGesture.ANY: {
            const bool = this._peripheral._sensors.gesture;
            return bool;
        }
        default:
            return this._peripheral._sensors.gesture === gesture;
        }
    }

    /**
     * @return {number} - the vision sensor's color value. Indexed LEGO brick colors.
     */
    getForce () {
        // To get a string representation, lookup the key of the PrimeColor-enum value
        return this._peripheral.force;
    }

    /**
     * @return {number} - the vision sensor's color value. Indexed LEGO brick colors.
     */
    getDistance () {
        // To get a string representation, lookup the key of the PrimeColor-enum value
        return this._peripheral.distance;
    }

    /**
     * Call a callback for each motor indexed by the provided motor ID.
     * @param {MotorID} motorID - the ID specifier.
     * @param {Function} callback - the function to call with the numeric motor index for each motor.
     * @private
     */
    _forEachMotor (motorID, callback) {
        let motors;
        switch (motorID) {
        case PrimeMotorLabel.A:
            motors = [PrimePort.A];
            break;
        case PrimeMotorLabel.B:
            motors = [PrimePort.B];
            break;
        case PrimeMotorLabel.C:
            motors = [PrimePort.C];
            break;
        case PrimeMotorLabel.D:
            motors = [PrimePort.D];
            break;
        case PrimeMotorLabel.E:
            motors = [PrimePort.E];
            break;
        case PrimeMotorLabel.F:
            motors = [PrimePort.F];
            break;
        case PrimeMotorLabel.ALL:
            motors = [PrimePort.A, PrimePort.B, PrimePort.C, PrimePort.D, PrimePort.E, PrimePort.F];
            break;
        default:
            log.warn(`Invalid motor ID: ${motorID}`);
            motors = [];
            break;
        }
        for (const index of motors) {
            callback(index);
        }
    }

    /**
     * Make the Prime peripheral play a MIDI note for the specified duration.
     * @param {object} args - the block's arguments.
     * @property {number} NOTE - the MIDI note to play.
     * @property {number} DURATION - the duration of the note, in seconds.
     * @return {Promise} - a promise which will resolve at the end of the duration.
     */

    _playNoteForPicker (note, category) {
        if (category !== this.getInfo().name) return;
        this.playNoteForSeconds({
            NOTE: note,
            DURATION: 0.20
        });
    }

    playNoteForSeconds (args) {
        let durationSec = Cast.toNumber(args.DURATION);
        durationSec = MathUtil.clamp(durationSec, 0, 10);

        let note = Cast.toNumber(args.NOTE);
        note = MathUtil.clamp(note, 10, 120);

        this._peripheral.playTone(note, durationSec);

        return new Promise(resolve => {
            setTimeout(resolve, durationSec * 1000);
        });
    }

    // todo: because the input is droppable, this function should:
    // - strip out any whitespace (e.g. spaces added by the list reporter)
    // - make sure we give the display a string of digits
    // - make sure the string of numbers is the correct length
    displaySymbol (args) {
        return this._peripheral.display(args.MATRIX);
    }

    displayClear () {
      // todo: use a const
        return this._peripheral.display('0000000000000000000000000');
    }
}

module.exports = Scratch3PrimeBlocks;
