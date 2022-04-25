function injectWebRTC() {
    var remoteIp = "4.3.2.1"
    var localIp = "1.2.3.4"
    let ipRegexp = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
    let isNotLocalIp = function (ip) {
        return !ip.match(/^(192\.168\.|169\.254\.|10\.|127\.|172\.(1[6-9]|2\d|3[01])\.)/);
    }
    let isIP = function (ip) {
        return ip.match(ipRegexp);
    }
    let replaceIP = function (line) {
        var e = line.split(" ");
        for (var i = 0; i < e.length; i++) {
            if (isIP(e[i])) {
                e[i] = e[i].replace(ipRegexp, isNotLocalIp(e[i]) ? remoteIp : localIp);
            }
        }
        return e.join(" ");
    }

    function makeid(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    let randInd = function (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
    }

    let uFragment = makeid(4);
    let cPort = randInd(50000, 65000);

    let newCandidate = function () {
        let candstr = "candidate:" + randInd(800000000, 900000000) + " 1 udp " + randInd(1043278322, 2043278322) + " " + remoteIp + " " + cPort + " typ srflx raddr 0.0.0.0 rport 0 generation 0 ufrag " + uFragment + " network-cost 999";
        return new RTCIceCandidate({
            sdpMLineIndex: 0,
            candidate: candstr,
            sdpMid: "0",
            port: cPort,
            usernameFragment: uFragment
        });
    }

    var spoof = {
        "candidate": function (target) {
            if (!target) {
                return;
            }
            var addr = target.prototype.__lookupGetter__('address');
            var cand = target.prototype.__lookupGetter__('candidate');
            var typeGetter = target.prototype.__lookupGetter__('type');
            Object.defineProperties(target.prototype,
                {
                    address: {
                        get: function () {
                            var realAddr = addr.call(this);
                            var type = typeGetter.call(this);
                            return realAddr.replace(ipRegexp, isNotLocalIp(realAddr) ? remoteIp : localIp);
                        }
                    },
                    candidate: {
                        get: function () {
                            var realCandidate = cand.call(this);
                            var type = typeGetter.call(this);
                            return replaceIP(realCandidate);
                        }
                    },
                });
        },
        "sdp": function (target) {
            var g = target.prototype.__lookupGetter__('sdp');
            Object.defineProperties(target.prototype,
                {
                    sdp: {
                        get: function () {
                            var realSdp = g.call(this);
                            var resLines = [];
                            var lines = realSdp.split("\n");
                            for (var i = 0; i < lines.length; i++) {
                                let line = lines[i];
                                if (line.includes("a=ice-ufrag")) {
                                    uFragment = line.replace("a=ice-ufrag", "").replace("\r", "");
                                }
                                if (0 === line.indexOf("a=candidate:")) {
                                    resLines.push(replaceIP(line));
                                } else {
                                    resLines.push(line);
                                }
                            }
                                                        return resLines.join("\n");
                        }
                    }
                });
        },
        "iceevent": function (target) {
            if (!target) {
                return;
            }
            var cand = target.prototype.__lookupGetter__('candidate');
            var typeGetter = target.prototype.__lookupGetter__('type');
            Object.defineProperties(target.prototype,
                {
                    candidate: {
                        get: function () {
                            var realCandidate = cand.call(this);
                            var type = typeGetter.call(this);
                            let tgt = this.target;
                            if (!tgt || !realCandidate || !realCandidate.candidate) {
                                return realCandidate;
                            }

                            if (realCandidate.type === "host") {
                                window.sentCand = true;
                                uFragment = realCandidate.usernameFragment;
                                cPort = realCandidate.port.toString();
                                let onice = tgt.onicecandidate;
                                if (onice) {
                                    console.log("sending iceevent")
                                    onice(new RTCPeerConnectionIceEvent("icecandidate", {
                                        candidate: newCandidate(),
                                        target: tgt
                                    }));
                                }
                            }
                            return realCandidate;
                        }
                    },
                });
        }
    }
    try {
        spoof.candidate(RTCIceCandidate);
        spoof.sdp(RTCSessionDescription);
    }
    catch (e) {}
    
    spoof.iceevent(RTCPeerConnectionIceEvent);
}

injectWebRTC();
