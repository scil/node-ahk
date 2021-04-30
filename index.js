const loadIniFile = require('read-ini-file')
const fs = require('fs');
const os = require('os');

const Module = class {
    constructor() {
        this.ahk = `${os.tmpdir()}/${Date.now()}.ahk`;
        this.dir = __dirname;
        this.script = `
        #Singleinstance, force

        IniRead, REMOVE_AHK_FILE, ${this.dir}/config.ini, message, REMOVE_AHK_FILE

        lastFileContent := ""
        lastFileCount   := 0

        file := FileOpen("${this.dir}/stream/ahk-node/ahk-node.stream", "w")
        file.write("event=" . REMOVE_AHK_FILE)
        file.close()

        Node_Write(event, string) {
            Random, suffix, 1, 100000
            file := FileOpen("${this.dir}/stream/ahk-node/ahk-node-" . suffix . ".stream", "w")
            file.write("event=" . event . "\`n" . string)
            file.close()
        }

        OnMessage(0x200, "WM_MOUSEMOVE")
        OnMessage(0x201,"WM_LBUTTONDOWN")
        WM_MOUSEMOVE(wParam,lParam){
            IniRead, EVENT_MOUSE_MOVE, ${this.dir}/config.ini, event, EVENT_MOUSE_MOVE

            MouseGetPos, MouseX, MouseY
            MouseX-=2
            MouseY-=25

            file := FileOpen("${this.dir}/stream/ahk-node/ahk-node.stream", "w")
            file.write("event=" . EVENT_MOUSE_MOVE . "\`n" . "x=" . MouseX . "\`n" . "y=" . MouseY)
            file.close()
        }
        WM_LBUTTONDOWN(wParam,lParam){
            IniRead, EVENT_CLICK_LEFT, ${this.dir}/config.ini, event, EVENT_CLICK_LEFT
            MouseX := lParam & 0xFFFF
            MouseY := lParam >> 16

            file := FileOpen("${this.dir}/stream/ahk-node/ahk-node.stream", "w")
            file.write("event=" . EVENT_CLICK_LEFT . "\`n" . "x=" . MouseX . "\`n" . "y=" . MouseY)
            file.close()
        }

        Gui_AddPicture(Options, Colour) {
            FileName := A_Temp "\" Colour ".bmp"
            Handle := DllCall("CreateFile", "Str", FileName, "Int", 0x40000000
                , "Int", 0, "Int", 0, "Int", 4, "Int", 0, "Int", 0)
        
            ;---------------------------------------------------------------------------
            Picture =
            ;---------------------------------------------------------------------------
                ( Join LTrim
                    42 4D 3A 00 | 00 00 00 00 | 00 00 36 00 | 00 00 28 00
                    00 00 01 00 | 00 00 01 00 | 00 00 01 00 | 18 00 00 00
                    00 00 04 00 | 00 00 00 00 | 00 00 00 00 | 00 00 00 00
                    00 00 00 00 | 00 00
                )
        
            Picture .= SubStr(Colour, 7, 2)
                    .  SubStr(Colour, 4, 2)
                    .  SubStr(Colour, 1, 2) "00"
            StringReplace, Picture, Picture, |,, All
            StringReplace, Picture, Picture, %A_Space%,, All
        
            Loop, % StrLen(Picture) // 2 {
                StringLeft, Hex, Picture, 2
                StringTrimLeft, Picture, Picture, 2
                DllCall("WriteFile", "Int", Handle, "CharP", "0x" Hex
                    , "Int", 1, "IntP", BytesWritten, "Int", 0)
            }
            DllCall("CloseHandle", "Int", Handle)
            Gui, 1:Add, Picture, %Options%, %FileName%
            FileDelete, %FileName%
        }

        Join(s,p*){
            static _:="".base.Join:=Func("Join")
            for k,v in p
            {
              if isobject(v)
                for k2, v2 in v
                  o.=s v2
              else
                o.=s v
            }
            return SubStr(o,StrLen(s)+1)
          }

        setTimer, checkFile, 1
        `;
        this.checker = `
        checkFile:
            if FileExist("${this.dir}/stream/node-ahk/node-ahk-" . lastFileCount . ".stream") {
                file := "${this.dir}/stream/node-ahk/node-ahk-" . lastFileCount . ".stream"
                fileread newFileContent, %file%
                filedelete, %file%

                lastFileCount +=1
                if(newFileContent != lastFileContent) {
                    IniRead, REMOVE_AHK_FILE, ${this.dir}/config.ini, message, REMOVE_AHK_FILE
                    IniRead, MESSAGE_STRING, ${this.dir}/config.ini, message, MESSAGE_STRING
                    IniRead, MESSAGE_JSON, ${this.dir}/config.ini, message, MESSAGE_JSON        
                    
                    lastFileContent := newFileContent
                    lines := StrSplit(newFileContent, "\`n")
                    event := StrSplit(StrSplit(lines[1], "=")[2], "\`r")[1]
    
                    lines.remove(1)

                    message := "\`n".join(lines)
    
                    Node_OnMessage(event, message)
    
                }
            }
        return
        `
        this.process = null;
        this.counters = {
            node: 0,
            ahk : 0
        }

        this.events = {};
        this.encryption = loadIniFile.sync(__dirname + '/config.ini')
        console.log(this.encryption)
    }

    on(event, listener) { "object" != typeof this.events[event] && (this.events[event] = []), this.events[event].push(listener); }
    emit(event) { var i, listeners, length, args = [].slice.call(arguments, 1); if ("object" == typeof this.events[event]) for (length = (listeners = this.events[event].slice()).length, i = 0; i < length; i++)listeners[i].apply(this, args); }

    gui() {
        var code = `Gui`;
        for (const argument in arguments) {
            code += `, ${arguments[argument]}`
        }
        this.script += `${code}\n`
        return this;
    }

    import(string) {
        this.script += `${string}\n`;
        return this;
    }

    write(event, string) {
        fs.writeFileSync(__dirname + `/stream/node-ahk/node-ahk-${this.counters.node}.stream`, `event=${event}\n${string}`,'utf8')
        this.counters.node++;
    }

    run() {
        var counter = 0;

        while (counter < 2) {
            if (counter = 2) {
                fs.readdir(__dirname + `/stream/node-ahk`, (err, files) => {
                    if (err) return;

                    files.forEach(file => {
                        fs.unlinkSync(__dirname + `/stream/node-ahk/` + file)
                    })
                })

                fs.readdir(__dirname + `/stream/ahk-node`, (err, files) => {
                    if (err) return;

                    files.forEach(file => {
                        fs.unlinkSync(__dirname + `/stream/ahk-node/` + file)
                    })
                })

                fs.writeFile(this.ahk, this.script.replace(/<Libraries>/g, __dirname + '/libraries') + this.checker, err => {
                    if (err) return;
        
                    const child = require('child_process').spawn("C:/Program Files/AutoHotkey/AutoHotkey.exe", [this.ahk]);
                    child.on("close", () => {
                        process.exit();
                    })
        
                    fs.watch(__dirname + '/stream/ahk-node', 'utf8', (event, file) => {
                        if (!fs.existsSync(__dirname + `/stream/ahk-node/${file}`)) return;
                        var msg = fs.readFileSync(__dirname + `/stream/ahk-node/${file}`, 'utf8');
                        fs.unlinkSync(__dirname + `/stream/ahk-node/${file}`);

                        var event = msg.split('\n')[0].split('=')[1];
                        var message = msg.split('\n').splice(1).join('\n');
        
                        switch (event) {
                            case this.encryption['message']['REMOVE_AHK_FILE']:
                                setTimeout(() => {
                                    if (fs.existsSync(this.ahk)) {
                                        fs.unlinkSync(this.ahk);
                                    }
                                }, 100)
                                break;
                            case this.encryption['message']['MESSAGE_STRING']:
                                console.log(val);
                                break;
                            case this.encryption['message']['MESSAGE_JSON']:
                                console.log(val);
                                break;
                            case this.encryption['event']['EVENT_CLICK_LEFT']:
                                this.emit('mouseclick-left', msg.split('\n')[1].split('=')[1], msg.split('\n')[2].split('=')[1])
                                break;
                            case this.encryption['event']['EVENT_MOUSE_MOVE']:
                                this.emit('mousemove', msg.split('\n')[1].split('=')[1], msg.split('\n')[2].split('=')[1])
                                break;
                            default:
                                this.emit('message', event, message)
                        }
                    })
        
                })
                break;
            }
        }
        return this;
    }
}

module.exports = Module;