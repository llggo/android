var adb = require('adbkit')
var client = adb.createClient()

const Executable = require('./library/exe.js')

const config = require('./config.json')

const proxy_exe = "./files/win/proxy.exe"

var args = ["--port", config.proxy.port]

var proxy = new Executable(proxy_exe, args)

proxy.ChangeArgsAndStart(args)
proxy.addListener('state', function(state){
    console.log(state)
})

proxy.addListener('data', function(data){
    console.log(data)
})

process.on('SIGINT', function(){
    client.listDevices()
    .then(function(devices) {
         devices.forEach(element => {
             if(config.android.screen.auto_off){
                client.shell(element.id, "input keyevent = POWER", function(){})
             }
        })


        setTimeout(function() {
            process.exit(1)
        }, 2000);
    })
})


client.trackDevices()
.then(function(tracker){

    tracker.on('add', function(device) {

        console.log('Device %s was plugged in', device.id)

        setTimeout(function() {

            

            if(config.android.screen.auto_on){
                // client.shell(device.id, "input keyevent = POWER", function(err, output){
                //     (err != null) ? console.log(err) : console.log('Device %s was received shell power', device.id)
                // })
                if(config.android.screen.auto_unlock){
                    client.shell(device.id, "input keyevent 82", function(err, output){
                        (err != null) ? console.log(err) : console.log('Device %s was received shell unlock screen', device.id)
                    })
                }
            }

            
    
            client.reverse(device.id, "tcp:" + config.proxy.port, "tcp:" + config.proxy.port, function(err){
                (err != null) ? console.log(err) : console.log('Device %s was reverse in http://localhost:%s', device.id, config.proxy.port)
            })

            if(config.proxy.to_android){
                client.shell(device.id, "settings put global http_proxy localhost:" + config.proxy.port, function(err, output){
                    (err != null) ? console.log(err) : console.log('Device %s was changed proxy to http://localhost:%s', device.id, config.proxy.port)
                })
            }

            //accelerometer_rotation 0 disable
            //accelerometer_rotation 1 enable
            client.shell(device.id, "settings put system accelerometer_rotation 0", function(err, output){
                (err != null) ? console.log(err) : console.log('Device %s was disable auto rotate', device.id)
                //user_rotation 0 Protrait 
                //user_rotation 1 Landscape
                //user_rotation 2 Protrait Reversed
                //user_rotation 3 Landscape Reversed
                client.shell(device.id, "settings put system user_rotation 1", function(err, output){
                    (err != null) ? console.log(err) : console.log('Device %s was rotate landscape', device.id)
                })
            })

            //check install apk 
            client.isInstalled(device.id, config.android.launcher.pkg, function(err, installed){
                if (err != null) {
                    console.log(err)
                }  else {
                    if(!installed){
                        console.log("Device %s no have launcher", device.id)
                        //install apk
                        if(config.android.launcher.auto_install){
                            client.install(device.id, config.android.launcher.apk, function(err){
                                if(err != null) {
                                    console.log(err)
                                } else{
                                    console.log('Device %s was installed launcher ', device.id)
                                    StartLauncher(device)
                                } 
                            })
                        }
                    }else{
                        console.log("Device %s have launcher", device.id)
                        StartLauncher(device)
                    }
                }
            })

            
        }, 100);
      })

    tracker.on('remove', function(device) {
        console.log('Device %s was unplugged', device.id)
    })

    tracker.on('end', function() {
        console.log('Tracking stopped')
    })
})
.catch(function(err) {
    console.error('Something went wrong:', err.stack)
})


function StartLauncher(device){
    //check app running
    client.shell(device.id, "pidof " + config.android.launcher.pkg)
    .then(adb.util.readAll)
    .then(function(output){
        if(output != ""){
            console.log("Launcher is running pid: " + output.toString('utf-8'))
        }else{
            if(config.android.launcher.auto_start){
            startLauncher(device, "address " + config.android.mq_address)
            }
        }
    })
}

function startLauncher(device, arg){

    var shell = "am start -n " + config.android.launcher.pkg + "/." + config.android.launcher.activity

    if(arg != ""){
        shell += " -e " + arg
    }

    client.shell(device.id, shell)
    .then(adb.util.readAll)
    .then(function(output){
        console.log(output.toString('utf-8'))
    }) 
}


