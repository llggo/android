const { spawn } = require('child_process');
const EventEmitter = require('events').EventEmitter;

const RESTART_DELAY = 3000;
const PREFIX = "<<<";
const SEPERATOR = " ";
const MAX_QUEUE_LENGTH = 100;

/**
 * @typedef {{uri: string; data: any;}} IBaseMessage
 */

class Executable extends EventEmitter {
    /**
     * 
     * @param {string} exePath 
     * @param {string[]} args 
     */
    constructor(exePath, args = []) {
        super();
        this.exePath = exePath;
        this.args = args;
        this.shouldRestart = true;
        this.queue = [];
        this.PREFIX = PREFIX;
        this.SEPERATOR = SEPERATOR;
    }

    ChangeArgsAndStart(args) {
        this.args = args;
        this.Restart();
    }

    Restart() {
        this.shouldRestart = true;
        if (this.child) {
            this.child.kill();
            console.log(`child ${this.exePath} be kill on restart`);
        }
        this.restart(1000);
    }

    Terminate() {
        if (this.child) {
            this.shouldRestart = false;
            this.child.kill();
        }
    }

    /**
     * 
     * @param {string} uri 
     * @param {string | Object} data 
     */

    Send(uri, data) {
        this.queue.push({ uri, data });
        if (this.queue.length >= MAX_QUEUE_LENGTH) {
            this.queue.splice(MAX_QUEUE_LENGTH / 2, MAX_QUEUE_LENGTH / 2);
        }
        this.fireQueue();
    }


    restart(delay = 1000) {
        setTimeout(_ => {
            if (this.shouldRestart) {
                if (this.child) {
                    this.restart(RESTART_DELAY);
                    return;
                }
                this.child = this.makeChild(
                    (data) => this.emit('data', data),
                    (line) => this.handleLine(line),
                    (e) => Log.Error(`child ${this.exePath} exe error ${e}`),
                    () => this.onChildExit()
                );
                this.onChildStart();
            }
        }, delay);
    }

    makeChild(onData, onNewLine, onError, onExit) {
        const child = spawn(this.exePath, this.args);

        child.stdout.on('data', function(data){
            onData(data)
        })

        child.stderr.setEncoding('utf-8');
        child.stderr.on('data', function(data){
            onData(data)
        })


        emitLines(child.stdout);
        child.stdout.setEncoding('utf-8');
        child.stdout.on('line', (raw) => {
            const line = this.trimRaw(raw);
            if (line) {
                onNewLine(line);
            }
        });
        child.on('error', onError);
        child.on('exit', onExit);
        child.on('close', onExit);
        return child;
    }


    fireQueue() {
        try {
            const lines = [];
            while (this.queue.length) {
                let arg = this.queue.shift();
                if (!arg || !arg.uri) {
                    continue;
                }
                const parts = [arg.uri];
                const arg1 = arg.data;
                if (arg1) {
                    if (typeof arg1 === 'object') {
                        parts.push(JSON.stringify(arg1));
                    } else {
                        parts.push(arg1);
                    }
                }
                lines.push(parts.join(this.SEPERATOR));
            }
            lines.push("");
            if (this.child && lines.length > 0) {
                this.child.stdin.write(lines.join("\n"));
            }
        } catch (error) {
            console.log(error);
        }
    }



    trimRaw(raw) {
        raw = raw.trim();
        if (raw.startsWith(this.PREFIX)) {
            const line = raw.substr(this.PREFIX.length);
            return line.trim();
        }
        return '';
    }

    handleLine(line) {
        const index = line.indexOf(" ");
        const uri = line.substring(0, index);
        const data = line.substring(index + 1);
        this.emit("message", uri, data);
    }

    onChildExit() {
        if (this.child) {
            this.child.removeAllListeners();
            this.child.stdout.removeAllListeners();
            this.child = null;
        }
        this.emit("state", "stopped");
        this.restart();
    }

    onChildStart() {
        this.emit("state", "started");
        this.fireQueue();
    }
}

//

/**
 * A quick little thingy that takes a Stream instance and makes
 * it emit 'line' events when a newline is encountered.
 *
 *   Usage:
 *   ‾‾‾‾‾
 *  emitLines(process.stdin)
 *  process.stdin.resume()
 *  process.stdin.setEncoding('utf8')
 *  process.stdin.on('line', function (line) {
 *    console.log(line event:', line)
 *  })
 *
 */
function emitLines(stream) {
    var backlog = ''
    stream.on('data', function(data) {
        backlog += data
        var n = backlog.indexOf('\n')
            // got a \n? emit one or more 'line' events
        while (n > 0) {
            stream.emit('line', backlog.substring(0, n))
            backlog = backlog.substring(n + 1)
            n = backlog.indexOf('\n')
        }
    })
    stream.on('end', function() {
        if (backlog) {
            stream.emit('line', backlog);
        }
    })
}

module.exports = Executable;

/**
 * const vibreate_exe = "vibrate.exe";
 * const args = [];
 * const vibrate = new Executable(vibrate_exe, args);
 * vibrate.ChangeArgsAndStart(args);
 * vibrate.Send("/vibrate", "set 1")
 * vibrate.Send("/vibrate", "run 1")
 * 
 */