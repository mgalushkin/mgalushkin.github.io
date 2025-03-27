<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Peer Connection Init</title>
</head>
<body>
    <script>
        function perf() {
  const start = performance.now();

  return (idx) => {
    console.log(performance.now() - start, idx);
  };
}

(async () => {
  const p = perf();

  p("0");
  const connection = new RTCPeerConnection(undefined);
  p("1");
  const dataChannel = connection.createDataChannel("");
  p("2");
  const offer = await connection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  p("3");

  const descriptor = await connection.setLocalDescription(offer);
  p("4");

  const audioCodecs = {
    sender: RTCRtpSender.getCapabilities("audio").codecs,
    receiver: RTCRtpReceiver.getCapabilities("audio").codecs,
  };
  const videoCodecs = {
    sender: RTCRtpSender.getCapabilities("video").codecs,
    receiver: RTCRtpReceiver.getCapabilities("video").codecs,
  };
  connection.close();

  return {
    audioCodecs,
    videoCodecs,
  };
})().catch(console.error);

    </script>
</body>
</html>
