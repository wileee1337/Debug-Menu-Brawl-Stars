// global cache
var cache = {
    modules: {},
    options: {}
};

const base = Process.findModuleByName('libg.so').base;
const SERVER_CONNECTION = 0xA2B454;
const PTHREAD_COND_WAKE_RETURN = 0x6108AA + 8 + 1;
const CREATE_MESSAGE_BY_TYPE = 0x14161C;
const SELECT_RETURN = 0xB7060;
const POINTER_SIZE = 4;

const WAKEUP_RETURN_ARRAY = [0x889ac, 0x122af8, 0x1a29d0, 0x49d004, 0x52bdb0, 0x53efb4];
const DEBUG_MENU_CTOR = 0x3A6E70;
const STAGE_ADD_CHILD = 0x36D3A8;
const STAGE_ADDRESS = 0xA2B360;
const ADD_FILE = 0x3A3C84;
const ascdebugsc = 0x9E4F2E;
const DEBUG_MENU_UPDATE_PTR = 0x10DDC4;
const EFFECT_PREVIEW_CTOR = 0x451328;
const EFFECT_PREVIEW_UPDATE_PTR = 0x21F71C;

var Login = 0;
var IsDebugMenuOpened = 0;

var buttons = {};

var buttonX = 820;
var buttonY = 75;

const StageAdd = new NativeFunction(base.add(STAGE_ADD_CHILD), 'void', ['pointer', 'pointer']);
const StageRemove = new NativeFunction(base.add(0x2EB38C), 'void', ['pointer', 'pointer']);
const fSetXY = new NativeFunction(base.add(0x3BAE28), 'void', ['pointer', 'float', 'float']);
const fSetText = new NativeFunction(base.add(0xA5E70), 'pointer', ['pointer', 'pointer']);
const AddFile = new NativeFunction(base.add(ADD_FILE), 'int', ['pointer', 'pointer', 'int', 'int', 'int', 'int']);
const DebugMenuCtor = new NativeFunction(base.add(DEBUG_MENU_CTOR), 'pointer', ['pointer']);
const EffectPreviewCtor = new NativeFunction(base.add(EFFECT_PREVIEW_CTOR), 'pointer', ['pointer']);
const DebugMenuUpdate = new NativeFunction(base.add(DEBUG_MENU_UPDATE_PTR), "int", ["pointer", "float"]);
const EffectPreviewUpdate = new NativeFunction(base.add(EFFECT_PREVIEW_UPDATE_PTR), "int", ["pointer", "float"]);

const DebugMenuBase = new NativeFunction(base.add(0x1A426C), 'pointer', ['pointer', 'pointer', 'pointer']);
const DebugMenuBaseSetTitle = new NativeFunction(base.add(0x3DDEA0), 'pointer', ['pointer', 'pointer']);
const DebugMenu_buttonClicked = new NativeFunction(base.add(0x8C2A40), 'pointer', ['pointer', 'pointer', 'pointer', 'pointer']);
const DebugMenuBaseCreateDebugButton = new NativeFunction(base.add(0x45BB3C), 'pointer', ['pointer', 'pointer', 'pointer', 'int', 'int', 'int']);
const GameButton = new NativeFunction(base.add(0x8C968), 'void', ['pointer'])
//libc native functions
var malloc = new NativeFunction(Module.findExportByName('libc.so', 'malloc'), 'pointer', ['int']);
var free = new NativeFunction(Module.findExportByName('libc.so', 'free'), 'void', ['pointer']);
var pthread_mutex_lock = new NativeFunction(Module.findExportByName('libc.so', 'pthread_mutex_lock'), 'int', ['pointer']);
var pthread_mutex_unlock = new NativeFunction(Module.findExportByName('libc.so', 'pthread_mutex_unlock'), 'int', ['pointer']);
var pthread_cond_signal = new NativeFunction(Module.findExportByName('libc.so', 'pthread_cond_signal'), 'int', ['pointer']);
var select = new NativeFunction(Module.findExportByName('libc.so', 'select'), 'int', ['int', 'pointer', 'pointer', 'pointer', 'pointer']);
var memmove = new NativeFunction(Module.findExportByName('libc.so', 'memmove'), 'pointer', ['pointer', 'pointer', 'int']);
var ntohs = new NativeFunction(Module.findExportByName('libc.so', 'ntohs'), 'uint16', ['uint16']);
var inet_addr = new NativeFunction(Module.findExportByName('libc.so', 'inet_addr'), 'int', ['pointer']);
var libc_send = new NativeFunction(Module.findExportByName('libc.so', 'send'), 'int', ['int', 'pointer', 'int', 'int']);
var libc_recv = new NativeFunction(Module.findExportByName('libc.so', 'recv'), 'int', ['int', 'pointer', 'int', 'int']);

cache.EffectMenu = malloc(500)
cache.SkinMenu = malloc(500)

function strPtr(content) {
    return Memory.allocUtf8String(content);
}

var Message = {
    _getByteStream: function(message) {
        return message.add(8);
    },
    _getVersion: function(message) {
        return Memory.readInt(message.add(4));
    },
    _setVersion: function(message, version) {
        Memory.writeInt(message.add(4), version);
    },
    _getMessageType: function(message) {
        return (new NativeFunction(Memory.readPointer(Memory.readPointer(message).add(20)), 'int', ['pointer']))(message);
    },
    _encode: function(message) {
        (new NativeFunction(Memory.readPointer(Memory.readPointer(message).add(8)), 'void', ['pointer']))(message);
    },
    _decode: function(message) {
        (new NativeFunction(Memory.readPointer(Memory.readPointer(message).add(12)), 'void', ['pointer']))(message);
    },
    _free: function(message) {
        (new NativeFunction(Memory.readPointer(Memory.readPointer(message).add(24)), 'void', ['pointer']))(message);
        (new NativeFunction(Memory.readPointer(Memory.readPointer(message).add(4)), 'void', ['pointer']))(message);
    }
};
var ByteStream = {
    _getOffset: function(byteStream) {
        return Memory.readInt(byteStream.add(16));
    },
    _getByteArray: function(byteStream) {
        return Memory.readPointer(byteStream.add(28));
    },
    _setByteArray: function(byteStream, array) {
        Memory.writePointer(byteStream.add(28), array);
    },
    _getLength: function(byteStream) {
        return Memory.readInt(byteStream.add(20));
    },
    _setLength: function(byteStream, length) {
        Memory.writeInt(byteStream.add(20), length);
    }
};
var Buffer = {
    _getEncodingLength: function(buffer) {
        return Memory.readU8(buffer.add(2)) << 16 | Memory.readU8(buffer.add(3)) << 8 | Memory.readU8(buffer.add(4));
    },
    _setEncodingLength: function(buffer, length) {
        Memory.writeU8(buffer.add(2), length >> 16 & 0xFF);
        Memory.writeU8(buffer.add(3), length >> 8 & 0xFF);
        Memory.writeU8(buffer.add(4), length & 0xFF);
    },
    _setMessageType: function(buffer, type) {
        Memory.writeU8(buffer.add(0), type >> 8 & 0xFF);
        Memory.writeU8(buffer.add(1), type & 0xFF);
    },
    _getMessageVersion: function(buffer) {
        return Memory.readU8(buffer.add(5)) << 8 | Memory.readU8(buffer.add(6));
    },
    _setMessageVersion: function(buffer, version) {
        Memory.writeU8(buffer.add(5), version >> 8 & 0xFF);
        Memory.writeU8(buffer.add(6), version & 0xFF);
    },
    _getMessageType: function(buffer) {
        return Memory.readU8(buffer) << 8 | Memory.readU8(buffer.add(1));
    }
};
var MessageQueue = {
    _getCapacity: function(queue) {
        return Memory.readInt(queue.add(4));
    },
    _get: function(queue, index) {
        return Memory.readPointer(Memory.readPointer(queue).add(POINTER_SIZE * index));
    },
    _set: function(queue, index, message) {
        Memory.writePointer(Memory.readPointer(queue).add(POINTER_SIZE * index), message);
    },
    _count: function(queue) {
        return Memory.readInt(queue.add(8));
    },
    _decrementCount: function(queue) {
        Memory.writeInt(queue.add(8), Memory.readInt(queue.add(8)) - 1);
    },
    _incrementCount: function(queue) {
        Memory.writeInt(queue.add(8), Memory.readInt(queue.add(8)) + 1);
    },
    _getDequeueIndex: function(queue) {
        return Memory.readInt(queue.add(12));
    },
    _getEnqueueIndex: function(queue) {
        return Memory.readInt(queue.add(16));
    },
    _setDequeueIndex: function(queue, index) {
        Memory.writeInt(queue.add(12), index);
    },
    _setEnqueueIndex: function(queue, index) {
        Memory.writeInt(queue.add(16), index);
    },
    _enqueue: function(queue, message) {
        pthread_mutex_lock(queue.sub(4));
        var index = MessageQueue._getEnqueueIndex(queue);
        MessageQueue._set(queue, index, message);
        MessageQueue._setEnqueueIndex(queue, (index + 1) % MessageQueue._getCapacity(queue));
        MessageQueue._incrementCount(queue);
        pthread_mutex_unlock(queue.sub(4));
    },
    _dequeue: function(queue) {
        var message = null;
        pthread_mutex_lock(queue.sub(4));
        if (MessageQueue._count(queue)) {
            var index = MessageQueue._getDequeueIndex(queue);
            message = MessageQueue._get(queue, index);
            MessageQueue._setDequeueIndex(queue, (index + 1) % MessageQueue._getCapacity(queue));
            MessageQueue._decrementCount(queue);
        }
        pthread_mutex_unlock(queue.sub(4));
        return message;
    }
};

const DebugMenu_getOffsets = {
	setXY(memory, x, y) {
	    memory.add(28).writeFloat(x);
	    memory.add(32).writeFloat(y);
	},
	setScale(mem, scale) {
	    mem.add(12).writeFloat(scale);
	    mem.add(24).writeFloat(scale);
	},
	getHeight(mema) {
	    return DisplayObject_getHeight(mema);
	},
	getWeight(mama) {
		return DisplayObject_getWeight(mama);
	},
	getX(mat) {
	    return mat.add(28).readFloat();
	},
	getY(mum) {
	    return mum.add(32).readFloat();
	},
	getClientHome() {
		return _0x182472().add(36).readPointer().add(16).readPointer();
	}
}

function DebugMenu_addButton(memory, buttonName) {
    new NativeFunction(base.add(0x403574), 'void', ['pointer'])(memory);
    let movieClip = new NativeFunction(base.add(0x13AE10), 'pointer', ['pointer', 'pointer', 'bool'])(strPtr("sc/debug.sc"), strPtr("debug_menu_item"), 1);
    new NativeFunction(base.add(0x29B6B4), 'void', ['pointer', 'pointer'])(memory, movieClip);

    fSetXY(memory, buttonX, buttonY);
    fSetText(memory, strPtr(buttonName));
    buttonY += 50;
}

function DebugMenu_createDebugButton() {
    let DebugMenuButton = malloc(1000);
    new NativeFunction(base.add(0x403574), 'void', ['pointer'])(DebugMenuButton);
    let movieClip = new NativeFunction(base.add(0x13AE10), 'pointer', ['pointer', 'pointer', 'bool'])(strPtr("sc/debug.sc"), strPtr("debug_menu_button"), 1);
    new NativeFunction(base.add(0x29B6B4), 'void', ['pointer', 'pointer'])(DebugMenuButton, movieClip);

    StageAdd(base.add(STAGE_ADDRESS).readPointer(), DebugMenuButton);
    fSetXY(DebugMenuButton, 30, 515);
    fSetText(DebugMenuButton, strPtr("A"));

    cache.debugmenu = malloc(500);
    DebugMenuBase(cache.debugmenu, strPtr('sc/debug.sc'), strPtr('debug_menu'));
    DebugMenuBaseSetTitle(cache.debugmenu, strPtr('Debug Menu 2.0'));

    cache.RestartGame = malloc(500);
    DebugMenu_addButton(cache.RestartGame, 'Restart Game');

    cache.EffectPreview = malloc(500);
    DebugMenu_addButton(cache.EffectPreview, 'Effect Preview');

    cache.SkinPreview = malloc(500);
    DebugMenu_addButton(cache.SkinPreview, 'Skin Preview');

    Interceptor.attach(base.add(0x2C7288), {
        onEnter(args) {
            if (args[0].toInt32() == DebugMenuButton.toInt32()) {
                if (IsDebugMenuOpened == 0) {
                    IsDebugMenuOpened = 1;
                    StageAdd(base.add(STAGE_ADDRESS).readPointer(), cache.debugmenu);
                    StageAdd(base.add(STAGE_ADDRESS).readPointer(), cache.RestartGame);
                    StageAdd(base.add(STAGE_ADDRESS).readPointer(), cache.EffectPreview);
                    StageAdd(base.add(STAGE_ADDRESS).readPointer(), cache.SkinPreview);
                    /*for ( var counter = 0; counter < buttons.length; counter++) {
                        StageAdd(base.add(STAGE_ADDRESS).readPointer(), memory[counter]);
                    }*/
                }
                else if (IsDebugMenuOpened == 1) {
                    IsDebugMenuOpened = 0;
                    StageRemove(base.add(STAGE_ADDRESS).readPointer(), cache.debugmenu);
                    StageRemove(base.add(STAGE_ADDRESS).readPointer(), cache.RestartGame);
                    StageRemove(base.add(STAGE_ADDRESS).readPointer(), cache.EffectPreview);
                    StageRemove(base.add(STAGE_ADDRESS).readPointer(), cache.SkinPreview);
                    /*for ( var counter = 0; counter < buttons.length; counter++) {
                        StageRemove(base.add(STAGE_ADDRESS).readPointer(), memory[counter]);
                    }*/
                }
            }
            if (args[0].toInt32() == cache.EffectPreview.toInt32()) {
                EffectPreviewCtor(cache.EffectMenu);
                StageAdd(base.add(STAGE_ADDRESS).readPointer(), cache.EffectMenu);
            }
            if (args[0].toInt32() == cache.SkinPreview.toInt32()) {
                SkinPreviewCtor(cache.SkinMenu);
                StageAdd(base.add(STAGE_ADDRESS).readPointer(), cache.SkinMenu);
            }
        }
    });
}

function setupMessaging() {
    cache.wakeUpReturnArray = [];
    for (var i = 0; i < WAKEUP_RETURN_ARRAY.length; i += 1) {
        cache.wakeUpReturnArray.push(base.add(WAKEUP_RETURN_ARRAY[i]));
    }
    cache.pthreadReturn = base.add(PTHREAD_COND_WAKE_RETURN);
    cache.selectReturn = base.add(SELECT_RETURN);
    cache.serverConnection = Memory.readPointer(base.add(SERVER_CONNECTION));
    cache.messaging = Memory.readPointer(cache.serverConnection.add(4));
    cache.messageFactory = Memory.readPointer(cache.messaging.add(52));
    cache.recvQueue = cache.messaging.add(60);
    cache.sendQueue = cache.messaging.add(84);
	cache.state = cache.messaging.add(212)
	cache.loginMessagePtr = cache.messaging.add(216);

    cache.createMessageByType = new NativeFunction(base.add(CREATE_MESSAGE_BY_TYPE), 'pointer', ['pointer', 'int']);

    cache.sendMessage = function (message) {
        Message._encode(message);
        var byteStream = Message._getByteStream(message);
        var messagePayloadLength = ByteStream._getOffset(byteStream);
        var messageBuffer = malloc(messagePayloadLength + 7);
        memmove(messageBuffer.add(7), ByteStream._getByteArray(byteStream), messagePayloadLength);
        Buffer._setEncodingLength(messageBuffer, messagePayloadLength);
        Buffer._setMessageType(messageBuffer, Message._getMessageType(message));
        Buffer._setMessageVersion(messageBuffer, Message._getVersion(message));
        libc_send(cache.fd, messageBuffer, messagePayloadLength + 7, 0);
        free(messageBuffer);
        //Message._free(message);
    };

    function onWakeup() {
        var message = MessageQueue._dequeue(cache.sendQueue);
        while (message) {
            var messageType = Message._getMessageType(message);
            if (messageType === 10100) {
                message = Memory.readPointer(cache.loginMessagePtr);
                Memory.writePointer(cache.loginMessagePtr, ptr(0));
				Login = 1;
            }
            cache.sendMessage(message);
            message = MessageQueue._dequeue(cache.sendQueue);
			
        }
    }

	function shelly() {
		var updater = Interceptor.attach(Module.findExportByName('libc.so', 'pthread_cond_signal'), {
			onEnter: function(args) {
				DebugMenuUpdate(cache.dptr, 20);
                EffectPreviewUpdate(cache.EffectMenu, 20);
			}
		});

	}
	
    function onReceive() {
        var headerBuffer = malloc(7);
        libc_recv(cache.fd, headerBuffer, 7, 256);
        var messageType = Buffer._getMessageType(headerBuffer);
		
		if (messageType >= 20000) {
			if (messageType === 20104) { //LoginOk
				Memory.writeInt(cache.state, 5);
                DebugMenu_createDebugButton();
			}
			if (messageType === 24101) {
                setTimeout(function() {
                    IsDebugMenuOpened = 0;
			        cache.dptr = malloc(500);
			        DebugMenuCtor(cache.dptr);
                    shelly();
			    }, 2000);
			}
			var payloadLength = Buffer._getEncodingLength(headerBuffer);
			var messageVersion = Buffer._getMessageVersion(headerBuffer);
			free(headerBuffer);
			var messageBuffer = malloc(payloadLength);
			libc_recv(cache.fd, messageBuffer, payloadLength, 256);
			var message = cache.createMessageByType(cache.messageFactory, messageType);
			Message._setVersion(message, messageVersion);
			var byteStream = Message._getByteStream(message);
			ByteStream._setLength(byteStream, payloadLength);
			if (payloadLength) {
				var byteArray = malloc(payloadLength);
				memmove(byteArray, messageBuffer, payloadLength);
				ByteStream._setByteArray(byteStream, byteArray);
			}
			Message._decode(message);
			// logMessage(message);
			MessageQueue._enqueue(cache.recvQueue, message);
			free(messageBuffer);
		}
    }
	

     Interceptor.replace(Module.findExportByName('libc.so', 'pthread_cond_signal'), new NativeCallback(function(a1) {
        if(!this.returnAddress.equals(cache.pthreadReturn)) {
            return pthread_cond_signal(a1);
        }
        var sp4 = Memory.readPointer(this.context.sp.add(4));
        for (var i = 0; i < cache.wakeUpReturnArray.length; i += 1) {
            if (sp4.equals(cache.wakeUpReturnArray[i])) {
                onWakeup();
                return 0;
            }
        }
        return pthread_cond_signal(a1);
    }, 'int', ['pointer']));
 
    Interceptor.replace(Module.findExportByName('libc.so', 'select'), new NativeCallback(function(nfds, readfds, writefds, exceptfds, timeout) {
        var r = select(nfds, readfds, writefds, exceptfds, timeout);
        if (this.returnAddress.equals(cache.selectReturn)) {
            onReceive();
        }
        return r;
    }, 'int', ['int', 'pointer', 'pointer', 'pointer', 'pointer']));
}


const adder = Interceptor.attach(base.add(ADD_FILE), {
onEnter: function(args) {
	adder.detach();
	AddFile(args[0], base.add(ascdebugsc), -1, -1, -1, -1);
    }
});
	
Interceptor.attach(Module.findExportByName('libc.so', 'connect'), {
	onEnter: function(args) {
	if (ntohs(Memory.readU16(args[1].add(2))) === 9339) {
		cache.fd = args[0].toInt32();
        var host = Memory.allocUtf8String("192.168.198.80");
        Memory.writeInt(args[1].add(4), inet_addr(host));
        Interceptor.revert(Module.findExportByName('libc.so', 'pthread_cond_signal'));
        Interceptor.revert(Module.findExportByName('libc.so', 'select'));
		setupMessaging();
		}
	}
});
