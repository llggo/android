var adb = require('adbkit')
var client = adb.createClient()

const EventEmitter = require('events').EventEmitter

const config = require('./config.json')

const pkg = config.android.launcher.pkg

const address = config.android.mq_address

const start_shell = "am start -n " + config.android.launcher.pkg + "/." + config.android.launcher.activity

class Launcher extends EventEmitter{
    constructor(id, with_address, kill_if_running){
        this.id = id
        this.shell = shell
        this.with_address = with_address
        if(this.with_address){
            start_shell += " -e address " + address
        }
    }

    Start(){
        if(!this.isRunning()){
            this.start()
        }
    }

    Stop(){
        if(!this.isRunning()){
            this.kill(this.pid)
        }
    }

    Restart(){
        this.Stop()

        this.Start()
    }

    isRunning(){
        client.shell(device.id, "pidof " + pkg)
        .then(adb.util.readAll)
        .then(function(output){
            this.pid = output.split(":")[1].trim()
            console.log(this.pid)

            if(this.pid) return true
            else return false
        })
        .catch(function(err){
            console.log(err)
            return false
        })
    }

    kill(pid){
        var err, output = this.shell("kill " + pid)
        if(err != nul){
            this.emit("error", err)
        }
    }

    start(){
        this.shell(this.start_shell)
    }

    shell(s){
        client.shell(this.id, s)
        .then(adb.util.readAll)
        .then(function(output){
            return null, output
        })
        .catch(function(err){
            return err, null
        })
    }
}

module.exports = Launcher