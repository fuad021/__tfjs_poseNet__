// ---------------- territory :: exercise completed (starts) -----------------------
// chinToChest
// lookCeiling
// rightHandToShoulder
// leftHandToShoulder
// headToTopBend
// ---------------- territory :: exercise completed (ends) -----------------------

// MediaRecorder states :: inactive, recording, paused

// recording vars
let chunks = [];
let if_record = true;
let mediaRecorder = 'not init';

let start_time;
function start_recording()
{
  if (mediaRecorder.state === 'inactive')
  {
    play_audio('./voice/manual/beep.mp3', '(recording starts) - state :: ' + mediaRecorder.state);
    start_time = Date.now();
    mediaRecorder.start();
  }
}

function stop_recording()
{
  if (mediaRecorder.state === 'recording')
  {
    mediaRecorder.stop();
    console.log('(recording finished) - state ::', mediaRecorder.state);
    console.log('Recording time :: ', Date.now() - start_time);
    play_audio('./voice/manual/beep-end.mp3', '(voice) exercise completed');
    play_audio('./voice/manual/completed-continue-or-terminate.mp3', '(voice) exercise completed');
    setTimeout(() => {exerciseName = '(none)'}, 10000);
  }
}

// api vars
let patientId = uuidv4();   // TEST
let testId = 'TEST-01';
let tenant = 'telemeddev';
let height = 76;
let exerciseName = '(none)';
let continue_exercise = false;
let exerciseMp3;
let is_api_call = true;
let queue_result = [];
const queue_url = 'https://romai.injurycloud.com/queue_status/?testId='+ testId +'&tenant='+ tenant +'&patientId=' + patientId

// color vars
const red = '#d2222d';
const yellow = '#ffbf00';
const green = '#238823';
const white = '#ffffff';
const black = '#000000';
let color = red;
let boundingBoxColor = red;

// draw vars
const x_adjust = 21;        // pose adjustment threshold
const y_adjust = 21;
const lineWidth = 12;
const pointRadius = 12;
let posture;
let is_posture_colorization = false;

let is_voice = true;
let completed_mb = false;

// misc
let is_start = false;
let all_keys = 'NO KEYS YET';
let frame_count = 1;
let confidence_score = 0.1;
let head_bool = false;
let leg_bool = false;
let curr_time = Date.now();
let interval = 10000;
let checker;
// ---------------- territory :: global variables (ends) -----------------------



// ---------------- territory :: utility (starts) -----------------------

function queue_api_call() {
  fetch(queue_url)
      .then((resp) => resp.json())
      .then(function(data) {let queue = data.queue; if(queue.length){queue.forEach(print_queue)}})
      .catch(function(error) {console.log(error)});
}
const queue_checker = setInterval(queue_api_call, 10000);    // TEST

// queue_api :: printing result
function print_queue(item, index) {
  if(!queue_result.includes(item.exerciseName) && item.status === "completed")
  {
      console.log('(api) queue :: new exercise -', item.exerciseName);
      queue_result.push(item.exerciseName);
      var queue = document.getElementById("queue");
      
      var a1 = document.createElement('a');
      var a2 = document.createElement('a');
      var a3 = document.createElement('a');
      var br = document.createElement('br');
      
      var link1 = document.createTextNode("raw_video");
      var link2 = document.createTextNode("rendered_picture");
      var link3 = document.createTextNode("rendered_video");
      
      a1.appendChild(link1);
      a1.title = "raw_video";  
      a1.href = item.request_output.raw_video;
      a1.target = "_blank"

      a2.appendChild(link2);
      a2.title = "rendered_picture";  
      a2.href = item.request_output.rendered_picture;
      a2.target = "_blank"

      a3.appendChild(link3);
      a3.title = "rendered_video";  
      a3.href = item.request_output.rendered_video;
      a3.target = "_blank"
      
      queue.appendChild(document.createTextNode(item.exerciseName + " :: "));
      queue.appendChild(a1);
      queue.appendChild(document.createTextNode(" - "));
      queue.appendChild(a2);
      queue.appendChild(document.createTextNode(" - "));
      queue.appendChild(a3);
      queue.appendChild(br);
  }
  else
  {
      console.log('(api) queue :: no new exercise');
  }
}


// misc utility
function uuidv4()
{
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

// blob to base64
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onloadend = function() {resolve(reader.result);}
        reader.readAsDataURL(file);
    });
}

function resetTimer(new_interval)
{
    if (new_interval !== interval)
    {
        interval = new_interval;
        clearInterval(checker);
        checker = setInterval(checkPoint, interval);
    }
}

function posture_colorization(keypoints, minConfidence)
{
    if (is_posture_colorization)
    {
        if (posture != 'sideface' && (exerciseName == 'chinToChest' || exerciseName == 'lookCeiling' || exerciseName == 'headToTopBend'))
        { 
            posture = 'sideface';
            console.log('(draw) posture_colorization :: ' + posture);

            var points = getPoints(keypoints);
            var x = points[0];
            var y = points[1];
            
            if ((Math.abs(x[5] - x[6]) < x_adjust*2) && (Math.abs(x[11] - x[12]) < x_adjust*2)) 
                color = red; // TEST - colorization not working
            else color = red;
        }
        else if (posture != 'frontface' && (exerciseName == 'rightHandToShoulder' || exerciseName == 'leftHandToShoulder'))
        {
            posture = 'frontface';
            console.log('(draw) posture_colorization :: ' + posture);

            res = fullBodyCheckConfCount(keypoints, minConfidence);
            if (res > 15) color = red;
            else color = red;
        }
    }
}

function play_audio_once(audio_dir, bool, message)
{
    if (!bool)
    {
        var audio = new Audio(audio_dir);
        audio.play();
        console.log(message);
        bool = true;
    }
    return bool;
}

function play_audio(audio_dir, message)
{
    if (is_voice)
    {
        var audio = new Audio(audio_dir);
        audio.play();
        console.log(message);
    }
}

function check_head(keypoints)
{
  if (keypoints[0].score < confidence_score && keypoints[1].score < confidence_score && keypoints[2].score < confidence_score && keypoints[3].score < confidence_score && keypoints[4].score < confidence_score)
      return false;
  else
      return true;
}

function check_leg(keypoints)
{
  // (keypoints[0].score < confidence_score) // surreal
  if (keypoints[15].score < confidence_score && keypoints[16].score < confidence_score)     // ALERT :: TEST SHORTCUT
      return false;
  else
      return true;
}




//for routine check of face & then full body           
function checkPoint()
{

    if (all_keys === 'NO KEYS YET')
    {
        console.log('Loading PoseNet & speech-command model...');
    }
    else
    {
        head_bool = check_head(all_keys);
        leg_bool = check_leg(all_keys);
        
        console.log("(checkpoint) triggering checkPoint @ " + (Date.now() - curr_time));
        curr_time = Date.now();
        
        is_voice = true;
        if (!head_bool)
        {
            if (mediaRecorder.state === 'recording')
            {
              is_api_call = false;
              mediaRecorder.stop();
              console.log('RECORDING (deleted) - state :: ', mediaRecorder.state);
            }
            play_audio('./voice/face_negative.mp3', "(voice) negative - face");
            resetTimer(7000);

        }
        else if (!leg_bool)
        {
            if (mediaRecorder.state === 'recording')
            {
              is_api_call = false;
              mediaRecorder.stop();
              console.log('RECORDING (deleted) - state :: ', mediaRecorder.state);
            }
            play_audio('./voice/full_body_negative.mp3', "(voice) negative - full body");
            resetTimer(7000);
        }
        else if (head_bool && leg_bool && exerciseName === '(none)')
        {
          play_audio('./voice/select_exercise.mp3', "(voice) please select an exercise from the dropdown menu.")
        }
    }
}


// ---------------- territory :: utility (ends) -----------------------


// ---------------- territory :: jQuery - buttons & dropdown (starts) -----------------------
$(document).ready(function(){
    
$("#start" ).on('click', function()
{
    if (!is_start)
    {
        is_start = true;
        checker = setInterval(checkPoint, interval);
        play_audio('voice/semi/welcome.mp3', '(voice) Welcome to mmh. Select an exercise from dropdown menu.');
    }
    else
    {
        console.log('(bool) is_start :: ' + is_start);
    }
})

$("#stop" ).on('click', function()
{
    if (is_start)
    {
        is_start = false;
        is_voice = true;
        play_audio('voice/semi/terminate.mp3', '(voice) Program terminating...')
        clearInterval(checker);
        clearInterval(queue_checker);
    }
    else
    {
        console.log('(bool) is_start :: ' + is_start);
    }
})

$("#select" ).on('change', function()
{
  console.log('(bool) is_start :: ', is_start);
    if (is_start)
    {
        var temp_exerciseName = $(this).val();
        if (temp_exerciseName !== '(none)')
        {
            exerciseName = temp_exerciseName;
            // exerciseMp3 = 'voice/semi/' + exerciseName + '.mp3';
            exerciseMp3 = 'voice/manual/start.mp3'
            console.log('(dropdown)', exerciseName);
            continue_exercise = true;
            checkPoint();
        }
        else
        {
            console.log('Invalid exercise.')
        }
    }
    else
    {
        console.log('Program is not started or terminated...')
    }
})});
// ---------------- territory :: jQuery - buttons & dropdown (ends) -----------------------




// ========================================================================================================
//                                            file :: data_util.js
// ========================================================================================================

function isNumeric(num){
  return !isNaN(num);
}

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

function getPoints(keypoints)
{
  var x = [];
  var y = [];
  for (let i = 0; i < keypoints.length; i++)
  {
    x.push(keypoints[i].position.x);
    y.push(keypoints[i].position.y);
  }
  return [x, y];
}

function posture_right_hands_up(keypoints)
{
    var points = getPoints(keypoints);
    var y = points[1];
    
    if (y[10] < y[8]) 
        return true;
    else
        return false;
}

function posture_left_hands_up(keypoints)
{
    var points = getPoints(keypoints);
    var y = points[1];
    
    if (y[9] < y[7]) 
        return true;
    else
        return false;
}

function posture_both_hands_up(keypoints)
{
    var points = getPoints(keypoints);
    var x = points[0];
    var y = points[1];
    
    if (y[10] < y[8] && y[9] < y[7]) 
    {
        return true;
    }
    else
    {
        return false;
    }
}

function head_tilt(x_s, y_s, x_adjust, y_adjust)
{
  return y_s[3] > y_s[4];
}

function fullBodyCheckConfCount(keypoints, minConfidence)
{
  // counts total keypoints captured
  var fullBodyFlag = 0;
  for (let i = 0; i < keypoints.length; i++)
  {
    const keypoint = keypoints[i];
    if (keypoint.score > minConfidence) { fullBodyFlag = fullBodyFlag + 1; }
  }
  return fullBodyFlag
}

function keypoint_scores(keypoints) {
  // returns keypoints scores
  var conf = [];
  for (let i = 0; i < keypoints.length; i++) {
    conf.push(keypoints[i].score);
  }
  return conf;
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
function toggleLoadingUI(
    showLoadingUI, loadingDivId = 'loading', mainDivId = 'main') {
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
        if (is_api_call)
        {
          const blob = new Blob(chunks, {'type':'video/mp4;'}); chunks = [];

          const filename = patientId + '-' + exerciseName + '-clientRaw.mp4'
          const rawVideoUrl = 'https://romai.injurycloud.com/client_storage/' + filename
          var base64data = 'noise';
          base64data = await readFile(blob);
          
          // POST :: client_storage
          const save_storage_data = {
              'patientId': patientId,
              'exerciseName': exerciseName,
              'filename': filename,
              'blobBase64': base64data
          }
          const post_storage_data = {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(save_storage_data)
          };
          
          // POST :: enqueue
          const data = {
              'patientId': patientId,
              'testId': testId,
              'tenant': tenant,
              'rawVideoUrl': rawVideoUrl,
              'height': height,
              'exerciseName': exerciseName
          }
          const post_data = {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(data)
          };
          
            // TEST SHORTCUT :: api calls
            console.log('(request) client_storage :: ' + filename);
            console.log('(request) blobBase64 :: ' + base64data.substring(0, 121));
            console.log('(typeof) base64data :: ' + typeof base64data);
            fetch('https://romai.injurycloud.com/client_storage/', post_storage_data)
                .then(response => response.json())
                .then(responseJSON => {console.log('(response) client_storage :: ', responseJSON)})
                .then(fetch('https://romai.injurycloud.com/process_exercise/', post_data)
                            .then(response => response.json())
                            .then(responseJSON => {console.log('(response) enqueue :: ', responseJSON)}));
            
            // PSEUDO :: api calls
            // console.log('(request) client_storage :: ' + filename);
            // console.log('(request) base64data :: ' + base64data.substring(0, 121));
            // console.log('(typeof) base64data :: ' + typeof base64data);
            // console.log('(apicall) client_storage :: ' + post_storage_data);
            // console.log('(apicall) process_exercise :: ' + post_data);
      }
      else 
      {
        chunks = [];
      }
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

const defaultQuantBytes = 2;

const defaultMobileNetMultiplier = isMobile() ? 0.50 : 0.75;
const defaultMobileNetStride = 16;
const defaultMobileNetInputResolution = 500;

const defaultResNetMultiplier = 1.0;
const defaultResNetStride = 32;
const defaultResNetInputResolution = 250;

const setMobileNet = {
    architecture: 'MobileNetV1',
    outputStride: defaultMobileNetStride,
    inputResolution: defaultMobileNetInputResolution,
    multiplier: defaultMobileNetMultiplier,
    quantBytes: defaultQuantBytes
}

const setResNet = {
  architecture: 'ResNet50',
  outputStride: defaultResNetStride,
  inputResolution: defaultResNetInputResolution,
  multiplier: defaultResNetMultiplier,
  quantBytes: defaultQuantBytes
}

const guiState = {
  algorithm: 'single-pose',
  input: setMobileNet,        // ALERT :: DEPLOY SHORTCUT :: change to ResNet50 model
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  multiPoseDetection: {
    maxPoseDetections: 5,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0,
  },
  output: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showBoundingBox: false,
  },
  net: null,
};


//  * Sets up dat.gui controller on the top-right of the window
function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }
}

//  * Feeds an image to posenet to estimate poses - this is where the magic
//  * happens. This function loops with a requestAnimationFrame method.
function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');

  // since images are being fed from a webcam, we want to feed in the
  // original image and then just flip the keypoints' x coordinates. If instead
  // we flip the image, then correcting left-right keypoint pairs requires a
  // permutation on all the keypoints.
  const flipPoseHorizontal = true;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    if (guiState.changeToArchitecture) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.changeToArchitecture,
        outputStride: guiState.outputStride,
        inputResolution: guiState.inputResolution,
        multiplier: guiState.multiplier,
      });
      toggleLoadingUI(false);
      guiState.architecture = guiState.changeToArchitecture;
      guiState.changeToArchitecture = null;
    }

    if (guiState.changeToMultiplier) {
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: guiState.outputStride,
        inputResolution: guiState.inputResolution,
        multiplier: +guiState.changeToMultiplier,
        quantBytes: guiState.quantBytes
      });
      toggleLoadingUI(false);
      guiState.multiplier = +guiState.changeToMultiplier;
      guiState.changeToMultiplier = null;
    }

    if (guiState.changeToOutputStride) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: +guiState.changeToOutputStride,
        inputResolution: guiState.inputResolution,
        multiplier: guiState.multiplier,
        quantBytes: guiState.quantBytes
      });
      toggleLoadingUI(false);
      guiState.outputStride = +guiState.changeToOutputStride;
      guiState.changeToOutputStride = null;
    }

    if (guiState.changeToInputResolution) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: guiState.outputStride,
        inputResolution: +guiState.changeToInputResolution,
        multiplier: guiState.multiplier,
        quantBytes: guiState.quantBytes
      });
      toggleLoadingUI(false);
      guiState.inputResolution = +guiState.changeToInputResolution;
      guiState.changeToInputResolution = null;
    }

    if (guiState.changeToQuantBytes) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: guiState.outputStride,
        inputResolution: guiState.inputResolution,
        multiplier: guiState.multiplier,
        quantBytes: guiState.changeToQuantBytes
      });
      toggleLoadingUI(false);
      guiState.quantBytes = guiState.changeToQuantBytes;
      guiState.changeToQuantBytes = null;
    }
    
    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    switch (guiState.algorithm) {
      case 'single-pose':
        const pose = await guiState.net.estimatePoses(video, {
          flipHorizontal: flipPoseHorizontal,
          decodingMethod: 'single-person'
        });
        poses = poses.concat(pose);
        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;
        break;
      case 'multi-pose':
        let all_poses = await guiState.net.estimatePoses(video, {
          flipHorizontal: flipPoseHorizontal,
          decodingMethod: 'multi-person',
          maxDetections: guiState.multiPoseDetection.maxPoseDetections,
          scoreThreshold: guiState.multiPoseDetection.minPartConfidence,
          nmsRadius: guiState.multiPoseDetection.nmsRadius
        });

        poses = poses.concat(all_poses);
        minPoseConfidence = +guiState.multiPoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.multiPoseDetection.minPartConfidence;
        break;
    }

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    if (guiState.output.showVideo)
    {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
    }

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
    poses.forEach(({score, keypoints}) => {
      all_keys = keypoints;
      if (score >= minPoseConfidence)
      {
        if (guiState.output.showPoints)
        {
          drawKeypoints(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showSkeleton)
        {
          drawSkeleton(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showBoundingBox)
        {
          drawBoundingBox(keypoints, ctx);
        }
      }
      
// ---------------- territory :: full body check (starts) -----------------------
        frame_count = frame_count + 1;
        if (head_bool && leg_bool && continue_exercise)     // hasn't started yet
        {
            // TEST
            play_audio(exerciseMp3, '(voice) ' + exerciseName + ' starting...');
            continue_exercise = false;
            setTimeout(start_recording, 10000);
            setTimeout(stop_recording, 15000);
        }
// ---------------- territory :: full body check (ends) -----------------------
    });

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}



//  * Kicks off the demo by loading the posenet model, finding and loading
//  * available camera devices, and setting off the detectPoseInRealTime function.
async function bindPage() {
  toggleLoadingUI(true);
  const net = await posenet.load({
    architecture: guiState.input.architecture,
    outputStride: guiState.input.outputStride,
    inputResolution: guiState.input.inputResolution,
    multiplier: guiState.input.multiplier,
    quantBytes: guiState.input.quantBytes
  });
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

  setupGui([], net);
  detectPoseInRealTime(video, net);
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

bindPage();
