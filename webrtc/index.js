/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

let begin;
let pc;
let stream;
let candidates;
let iceEvents = []

const candidateTBody = document.querySelector('tbody#candidatesBody');
const icEvents = document.getElementById('iceEvents')
const proto = document.getElementById('proto')

let text = '<br>'
text = text.concat(RTCIceCandidate.prototype.__lookupGetter__('candidate')).concat('<br>')
text = text.concat(Function.prototype.toString.apply(RTCIceCandidate.prototype.__lookupGetter__('candidate'))).concat('<br>')
text = text.concat(RTCSessionDescription.prototype.__lookupGetter__('sdp')).concat('<br>')
text = text.concat(Function.prototype.toString.apply(RTCSessionDescription.prototype.__lookupGetter__('sdp'))).concat('<br>')
text = text.concat(RTCPeerConnectionIceEvent.prototype.__lookupGetter__('candidate')).concat('<br>')
text = text.concat(Function.prototype.toString.apply(RTCPeerConnectionIceEvent.prototype.__lookupGetter__('candidate'))).concat('<br>')
proto.innerHTML = text

async function start() {
  // Clean out the table.
  while (candidateTBody.firstChild) {
    candidateTBody.removeChild(candidateTBody.firstChild);
  }

  // stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
  const config = {
      "iceServers": [
          {"urls":["stun:stun.l.google.com:19302"]},
          // {"urls":["turn:aa.online-metrix.net?transport=udp"],"username":"1:usllpic0:a4f38b8f1790a4e8527945c5fffc94b8;829cbe08b0172243","credential":"a4f38b8f1790a4e8527945c5fffc94b8"}
      ],
      "iceTransportPolicy": "all",
      "iceCandidatePoolSize": 0
  }

  const offerOptions = {offerToReceiveAudio: 1};
  // Whether we gather IPv6 candidates.
  // Whether we only gather a single set of candidates for RTP and RTCP.

  const errDiv = document.getElementById('error');
  errDiv.innerText = '';
  let desc;
  try {
    pc = new RTCPeerConnection(config);
    pc.onicecandidate = iceCallback;
    pc.onicegatheringstatechange = gatheringStateChange;
    // pc.onicecandidateerror = iceCandidateError;
    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }
    desc = await pc.createOffer(offerOptions);
  } catch (err) {
    errDiv.innerText = `Error creating offer: ${err}`;
    gatherButton.disabled = false;
    return;
  }
  begin = window.performance.now();
  candidates = [];
  pc.setLocalDescription(desc);
}

// Parse the uint32 PRIORITY field into its constituent parts from RFC 5245,
// type preference, local preference, and (256 - component ID).
// ex: 126 | 32252 | 255 (126 is host preference, 255 is component ID 1)
function formatPriority(priority) {
  return [
    priority >> 24,
    (priority >> 8) & 0xFFFF,
    priority & 0xFF
  ].join(' | ');
}

function appendCell(row, val, span) {
  const cell = document.createElement('td');
  cell.textContent = val;
  if (span) {
    cell.setAttribute('colspan', span);
  }
  row.appendChild(cell);
}

function iceCallback(event) {
  // console.log(event)
  iceEvents.push({
    isTrusted: event.isTrusted,
    bubbles: event.bubbles,
    cancelBubble: event.cancelBubble,
    cancelable: event.cancelable,
    composed: event.composed,
    defaultPrevented: event.defaultPrevented,
    eventPhase: event.eventPhase,
    path: event.path,
    returnValue: event.returnValue,
    timeStamp: event.timeStamp,
    type: event.type,
    candidate: event.candidate ? {
      address: event.candidate.address,
      candidate: event.candidate.candidate,
      component: event.candidate.component,
      foundation: event.candidate.foundation,
      port: event.candidate.port,
      priority: event.candidate.priority,
      protocol: event.candidate.protocol,
      relatedAddress: event.candidate.relatedAddress,
      relatedPort: event.candidate.relatedPort,
      sdpMLineIndex: event.candidate.sdpMLineIndex,
      sdpMid: event.candidate.sdpMid,
      tcpType: event.candidate.tcpType,
      type: event.candidate.type,
      usernameFragment: event.candidate.usernameFragment,
    } : null,
    currentTarget: {
      localDescription: {
        sdp: event.currentTarget.localDescription.sdp.split('\n'),
        type: event.currentTarget.localDescription.type
      },
      pendingLocalDescription: {
        sdp: event.currentTarget.pendingLocalDescription.sdp.split('\n'),
        type: event.currentTarget.pendingLocalDescription.type
      }
    },
    srcElement: {
      localDescription: {
        sdp: event.srcElement.localDescription.sdp.split('\n'),
        type: event.srcElement.localDescription.type
      },
      pendingLocalDescription: {
        sdp: event.srcElement.pendingLocalDescription.sdp.split('\n'),
        type: event.srcElement.pendingLocalDescription.type
      }
    },
    target: {
      localDescription: {
        sdp: event.target.localDescription.sdp.split('\n'),
        type: event.target.localDescription.type
      },
      pendingLocalDescription: {
        sdp: event.target.pendingLocalDescription.sdp.split('\n'),
        type: event.target.pendingLocalDescription.type
      }
    },
  })

  icEvents.innerHTML = ""

  for (let e of iceEvents) {
    console.log(e)
    let div = document.createElement("div")
    let pre = document.createElement("pre")
    pre.innerHTML = JSON.stringify(e, null, 2)
    div.append(pre)
    icEvents.append(pre)
  }


  const elapsed = ((window.performance.now() - begin) / 1000).toFixed(3);
  const row = document.createElement('tr');

  appendCell(row, elapsed);
  if (event.candidate) {
    if (event.candidate.candidate === '') {
      return;
    }
    const {candidate} = event;

    // ignore local addresses
    if (
      candidate.address.startsWith('10.') ||
      candidate.address.startsWith('192.')
    ) {
      return
    }

    appendCell(row, candidate.component);
    appendCell(row, candidate.type);
    appendCell(row, candidate.foundation);
    appendCell(row, candidate.protocol);
    appendCell(row, candidate.address);
    appendCell(row, candidate.port);
    appendCell(row, formatPriority(candidate.priority));
    // appendCell(row, candidate.sdpMid);
    // appendCell(row, candidate.sdpMLineIndex);
    // appendCell(row, candidate.usernameFragment);
    candidates.push(candidate)
  } else if (!('onicegatheringstatechange' in RTCPeerConnection.prototype)) {
    // should not be done if its done in the icegatheringstatechange callback.
    // appendCell(row, getFinalResult(), 10);
    pc.close();
    pc = null;
    pc = null;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }
  candidateTBody.appendChild(row);
}

function gatheringStateChange() {
  if (pc.iceGatheringState !== 'complete') {
    return;
  }
  const elapsed = ((window.performance.now() - begin) / 1000).toFixed(3);
  const row = document.createElement('tr');
  appendCell(row, elapsed);
  // appendCell(row, getFinalResult(), 7);
  pc.close();
  pc = null;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  candidateTBody.appendChild(row);
}

// check if we have getUserMedia permissions.
// navigator.mediaDevices
//     .enumerateDevices()
//     .then(function(devices) {
//       devices.forEach(function(device) {
//         if (device.label !== '') {
//           document.getElementById('getUserMediaPermissions').style.display = 'block';
//         }
//       });
//     });

start()
