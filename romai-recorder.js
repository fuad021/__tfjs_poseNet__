// recording vars
let chunks = [];
let if_record = true;
let mediaRecorder = 'not init';

document.getElementById("status").innerHTML = 'Camera :: INACTIVE (no video recorded or snapshot taken yet).';

function uuidv4()
{
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

function start_recording()
{
  if (mediaRecorder.state === 'inactive')
  {
    mediaRecorder.start();
  }
}

function stop_recording()
{
  if (mediaRecorder.state === 'recording')
  {
    mediaRecorder.stop();
  }
}

// color vars
const red = '#d2222d';
let color = red;
let boundingBoxColor = red;

const lineWidth = 12;
const pointRadius = 12;

let is_start = false;

// ---------------- territory :: jQuery - buttons (starts) -----------------------
$(document).ready(function(){
    
  $("#start" ).on('click', function()
  {
      if (!is_start)
      {
          is_start = true;
          document.getElementById("status").innerHTML = "Camera :: RECORDING...";

          start_recording();  // TODO  
      }
      else
      {
          document.getElementById("status").innerHTML = "Camera :: RECORDING!!! Please stop recording first to start again.";
      }
  })

  $("#stop" ).on('click', function()
  {
      if (is_start)
      {
          is_start = false;
          document.getElementById("status").innerHTML = "Camera :: INACTIVE (video recorded).";
          stop_recording();   // TODO 
      }
      else
      {
          document.getElementById("status").innerHTML = "Camera :: INACTIVE (video recorded). Please start recording first.";
      }
  })
  
  $("#snap" ).on('click', function()
  {
      const canvas = document.getElementById('output');
      const ctx = canvas.getContext('2d');
      const snapURL = canvas.toDataURL("image/png");

      const link = document.createElement('a');
      link.href = snapURL;
      link.download = uuidv4()+'.png';
      
      document.body.appendChild(link);
      link.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));	          
      document.body.removeChild(link);
      
      document.getElementById("status").innerHTML = "Camera :: INACTIVE (snapshot taken).";
  })
});
// ---------------- territory :: jQuery - buttons & dropdown (ends) -----------------------




// ========================================================================================================
//                                            file :: data_util.js
// ========================================================================================================

function toTuple({y, x}) {
  return [y, x];
}

function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

// Draws a line on a canvas, i.e. a joint
function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

// Draws a pose skeleton by looking up all adjacent keypoints/joints
function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence);

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(
        toTuple(keypoints[0].position), toTuple(keypoints[1].position), color,
        scale, ctx);
  });
}

function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
    
    // posture_colorization(keypoints, minConfidence);
  
    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];

        if (keypoint.score < minConfidence) {
            continue;
        }

        const {y, x} = keypoint.position;
        drawPoint(ctx, y * scale, x * scale, pointRadius, color);
    }
}

//  * Draw the bounding box of a pose. For example, for a whole person standing
//  * in an image, the bounding box will begin at the nose and extend to one of
//  * ankles
function drawBoundingBox(keypoints, ctx) {
  const boundingBox = posenet.getBoundingBox(keypoints);

  ctx.rect(
      boundingBox.minX, boundingBox.minY, boundingBox.maxX - boundingBox.minX,
      boundingBox.maxY - boundingBox.minY);

  ctx.strokeStyle = boundingBoxColor;
  ctx.stroke();
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

// Toggles between the loading UI and the main canvas UI.
function toggleLoadingUI(showLoadingUI, loadingDivId = 'loading', mainDivId = 'main') {
  if (showLoadingUI) {
    document.getElementById(loadingDivId).style.display = 'block';
    document.getElementById(mainDivId).style.display = 'none';
  } else {
    document.getElementById(loadingDivId).style.display = 'none';
    document.getElementById(mainDivId).style.display = 'block';
  }
}

// ========================================================================================================
//                                             file :: camera.js
// ========================================================================================================

const videoWidth = 480;
const videoHeight = 480;



//  * Loads a the camera to be used in the demo
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  let constraintObj = { 'audio': false, 'video': { facingMode: 'user', width: mobile ? undefined : videoWidth, height: mobile ? undefined : videoHeight} }

  navigator.mediaDevices.getUserMedia(constraintObj).then(function(mediaStreamObj) {
      video.srcObject = mediaStreamObj;
      
// ---------------- territory :: record exercise (starts) -----------------------
      
      mediaRecorder = new MediaRecorder(mediaStreamObj);
      
      mediaRecorder.ondataavailable = function(ev) {
          chunks.push(ev.data);
      }
      
      mediaRecorder.onstop = async function(ev) {
          const blob = new Blob(chunks, {'type':'video/mp4;'}); chunks = [];
          const blobVideoURL = window.URL.createObjectURL(blob);

          // TODO :: save video
          const link = document.createElement('a');
          link.href = blobVideoURL;
          link.download = uuidv4()+'.mp4';
          
          document.body.appendChild(link);
          link.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));	          
          document.body.removeChild(link);
      }
// ---------------- territory :: record exercise (ends) -----------------------

  }).catch(function(err) {
      console.log(err.name, err.message);
  });

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();
  return video;
}

function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  const flipPoseHorizontal = true;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {

    ctx.clearRect(0, 0, videoWidth, videoHeight);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

async function bindPage() {
  toggleLoadingUI(true);
  const net = false;
  toggleLoadingUI(false);

  let video;
  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture, or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  detectPoseInRealTime(video, net);
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

bindPage();
