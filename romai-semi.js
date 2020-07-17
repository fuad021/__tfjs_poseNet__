// ---------------- territory :: exercise completed (starts) -----------------------
// chinToChest
// lookCeiling
// rightHandToShoulder
// leftHandToShoulder
// headToTopBend
// ---------------- territory :: exercise completed (ends) -----------------------



// ---------------- territory :: global variables (starts) -----------------------
// voice recognition vars
let recognizer;
let voice_captured;
let is_voice_recognizer_enabled = true;

// recording vars
let chunks = [];
let if_record = true;
let start_record = true;
let mediaRecorder = 'not init';

// api vars
let patientId = uuidv4();
let testId = 'TEST-01';
let tenant = 'telemeddev';
let height = 76;
let exerciseName = '(none)';
let continue_exercise = false;
let exerciseMp3;
let is_api_call = true;

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
let is_posture_colorization = true;

// voice vars
let user_voice = 'noise';
let noise_captured = 'noise';
let is_voice = true;
let welcome_mb = false;
let beep_mb = false;
let wrong_pose_mb = false;
let completed_mb = false;

// misc
let is_start = false;
let all_keys = 'NO KEYS YET';
let frame_count = 1;
let confidence_score = 0.1;
let head_bool = false;
let leg_bool = false;
let curr_time = Date.now();
let waiting_yes_time = Date.now();
let yes_triggered = 99999;
let interval = 10000;
let checker;
// ---------------- territory :: global variables (ends) -----------------------



// ---------------- territory :: utility (starts) -----------------------

// voice recognition utility
function predictWord() {
    const words = recognizer.wordLabels();
    const threshold = 0.9;
    var score = -1;
    var yes_score = -1;
    var go_score = -1;
    var time = Date.now();
    var time_th = 1500;
    
    recognizer.listen(({scores}) => {
        scores = Array.from(scores).map((s, i) => ({score: s, word: words[i]}));
        
        yes_score = scores[18].score;
        go_score = scores[6].score;
        if (is_voice_recognizer_enabled)
        {
          if (go_score > yes_score && go_score > threshold && time + time_th < Date.now())
          {
              time = Date.now();
              voice_captured = scores[6].word;
              console.log('(predictWord) CAPTURED :: ' + voice_captured);
              score = go_score;
          }
          else if (go_score < yes_score && yes_score > threshold && time + time_th < Date.now())
          {
              time = Date.now();
              voice_captured = scores[18].word;
              console.log('(predictWord) CAPTURED :: ' + voice_captured);
              score = yes_score;
          }
        }
    }, {probabilityThreshold: threshold});
}

async function voice_recognizer()
{
    recognizer = speechCommands.create('BROWSER_FFT');
    await recognizer.ensureModelLoaded();
    predictWord();
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
                color = green;
            else color = red;
        }
        else if (posture != 'frontface' && (exerciseName == 'rightHandToShoulder' || exerciseName == 'leftHandToShoulder'))
        {
            posture = 'frontface';
            console.log('(draw) posture_colorization :: ' + posture);

            res = fullBodyCheckConfCount(keypoints, minConfidence);
            if (res > 15) color = green;
            else color = red;
        }
    }
}

function recording()
{
    if (if_record)
    {
        if (user_voice === 'yes' && start_record && mediaRecorder.state === 'inactive')
        {
            mediaRecorder.start();
            console.log('RECORDING (starts) - state :: ' + mediaRecorder.state);
            start_record = false;
        }
        else if (user_voice === 'go' && mediaRecorder.state === 'recording')
        {
            if_record = false;
            mediaRecorder.stop();
            console.log('RECORDING (finished) - state ::', mediaRecorder.state);
            user_voice = 'noise';
        }
    }
    else 
    {
        // console.log('(bool) if_record :: ', if_record);
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
  // if (keypoints[0].score < confidence_score) // surreal
  if (keypoints[15].score < confidence_score && keypoints[16].score < confidence_score)     // ALERT :: TEST SHORTCUT
      return false;
  else
      return true;
}

/*
 * for routine check of face & then full body
 */
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
            user_voice = 'noise';
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
            user_voice = 'noise';
            play_audio('./voice/full_body_negative.mp3', "(voice) negative - full body");
            resetTimer(7000);
        }
    }
}

function check_userVoice()
{    
    is_api_call = true;
    // (clarification) user_voice !== 'go' in 20 sec
    if ((waiting_yes_time + 20000) < Date.now() && user_voice === 'yes')  // ISSUE OVERLAPPING
    {
        user_voice = 'noise';
        console.log('#### YES TIMEOUT #### :: ' + (Date.now() - waiting_yes_time));
        beep_mb = false;
        wrong_pose_mb = false;
        completed_mb = false;

        if (mediaRecorder.state === 'recording')
        {
          is_api_call = false;
          mediaRecorder.stop();
          console.log('RECORDING (deleted) - state :: ', mediaRecorder.state);
        }
    }
    
    if (voice_captured !== user_voice)
    {
        if ((voice_captured === 'yes' || voice_captured === 'go') && user_voice !== voice_captured) 
        {
            yes_triggered = Date.now() - waiting_yes_time;
            waiting_yes_time = Date.now();
            
            user_voice = voice_captured;
            console.log('(assigned) CAPTURED USER_VOICE :: ' + user_voice);
            voice_captured = '';
            
            if (user_voice === 'yes') if_record = true;
            
            // IMPROVEMENT ISSUE :: for timelimitting yes command
            /*
            if (yes_triggered < 5000)
            {
                user_voice = voice_captured;
                console.log('(assigned) CAPTURED USER_VOICE :: ' + user_voice + ' at time :: ' + yes_triggered);
                voice_captured = 'noise';
            }
            else
            {
                console.log('(not assigned) CAPTURE TIMEOUT :: ' + voice_captured + ' at time :: ' + yes_triggered);
            }
            */

        }
        else if (noise_captured !== voice_captured && (voice_captured !== 'yes' || voice_captured !== 'go'))
        {
            noise_captured = voice_captured;
            console.log('(not assigned) CAPTURED NOISE :: ' + noise_captured);
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
        is_voice_recognizer_enabled = true;
        voice_recognizer();
        checker = setInterval(checkPoint, interval);
        // ALERT :: TEST SHORTCUT - semi/welcome
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
        if (is_voice_recognizer_enabled) 
        {
            is_voice_recognizer_enabled = false;
            console.log('(voice_recognizer) :: DISABLED');
        }
    }
    else
    {
        console.log('(bool) is_start :: ' + is_start);
        // play_audio('voice/semi/start-again.mp3', '(voice) Program is terminated. Please start the program.')
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
            exerciseMp3 = 'voice/semi/' + exerciseName + '.mp3';
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

/**
 * Draws a line on a canvas, i.e. a joint
 */
function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
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
    
    posture_colorization(keypoints, minConfidence);
  
    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];

        if (keypoint.score < minConfidence) {
            continue;
        }

        const {y, x} = keypoint.position;
        drawPoint(ctx, y * scale, x * scale, pointRadius, color);
    }
}

/**
 * Draw the bounding box of a pose. For example, for a whole person standing
 * in an image, the bounding box will begin at the nose and extend to one of
 * ankles
 */
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

/**
 * Toggles between the loading UI and the main canvas UI.
 */
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

// ISSUE :: NO USE
/**
 * Converts an arary of pixel data into an ImageData object
 */
// async function renderToCanvas(a, ctx) {
//   const [height, width] = a.shape;
//   const imageData = new ImageData(width, height);
// 
//   const data = await a.data();
// 
//   for (let i = 0; i < height * width; ++i) {
//     const j = i * 4;
//     const k = i * 3;
// 
//     imageData.data[j + 0] = data[k + 0];
//     imageData.data[j + 1] = data[k + 1];
//     imageData.data[j + 2] = data[k + 2];
//     imageData.data[j + 3] = 255;
//   }
// 
//   ctx.putImageData(imageData, 0, 0);
// }

/**
 * Draw an image on a canvas
 */
// function renderImageToCanvas(image, size, canvas) {
//   canvas.width = size[0];
//   canvas.height = size[1];
//   const ctx = canvas.getContext('2d');
// 
//   ctx.drawImage(image, 0, 0);
// }


/**
 * Draw heatmap values, one of the model outputs, on to the canvas
 * Read our blog post for a description of PoseNet's heatmap outputs
 * https://medium.com/tensorflow/real-time-human-pose-estimation-in-the-browser-with-tensorflow-js-7dd0bc881cd5
 */
function drawHeatMapValues(heatMapValues, outputStride, canvas) {
  const ctx = canvas.getContext('2d');
  const radius = 5;
  const scaledValues = heatMapValues.mul(tf.scalar(outputStride, 'int32'));

  drawPoints(ctx, scaledValues, radius, color);
}

/**
 * Used by the drawHeatMapValues method to draw heatmap points on to
 * the canvas
 */
function drawPoints(ctx, points, radius, color) {
  const data = points.buffer().values;

  for (let i = 0; i < data.length; i += 2) {
    const pointY = data[i];
    const pointX = data[i + 1];

    if (pointX !== 0 && pointY !== 0) {
      ctx.beginPath();
      ctx.arc(pointX, pointY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
}

/**
 * Draw offset vector values, one of the model outputs, on to the canvas
 * Read our blog post for a description of PoseNet's offset vector outputs
 * https://medium.com/tensorflow/real-time-human-pose-estimation-in-the-browser-with-tensorflow-js-7dd0bc881cd5
 */
function drawOffsetVectors(
    heatMapValues, offsets, outputStride, scale = 1, ctx) {
  const offsetPoints =
      posenet.singlePose.getOffsetPoints(heatMapValues, outputStride, offsets);

  const heatmapData = heatMapValues.buffer().values;
  const offsetPointsData = offsetPoints.buffer().values;

  for (let i = 0; i < heatmapData.length; i += 2) {
    const heatmapY = heatmapData[i] * outputStride;
    const heatmapX = heatmapData[i + 1] * outputStride;
    const offsetPointY = offsetPointsData[i];
    const offsetPointX = offsetPointsData[i + 1];

    drawSegment(
        [heatmapY, heatmapX], [offsetPointY, offsetPointX], color, scale, ctx);
  }
}

// ========================================================================================================
//                                             file :: camera.js
// ========================================================================================================

const videoWidth = 480;
const videoHeight = 480;

/**
 * Loads a the camera to be used in the demo
 *
 */
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
          // debug
          const blob = new Blob(chunks, {'type':'video/mp4;'}); chunks = [];

          const blobVideoURL = window.URL.createObjectURL(blob);
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
          
            // ALERT :: TEST SHORTCUT :: api calls
            console.log('(request) client_storage :: ' + filename);
            console.log('(request) blobBase64 :: ' + base64data.substring(0, 121));
            console.log('(typeof) base64data :: ' + typeof base64data);
            fetch('https://romai.injurycloud.com/client_storage/', post_storage_data)
                .then(response => response.json())
                .then(responseJSON => {console.log('(response) client_storage :: ', responseJSON)})
                .then(fetch('https://romai.injurycloud.com/process_exercise/', post_data)
                            .then(response => response.json())
                            .then(responseJSON => {console.log('(response) enqueue :: ', responseJSON)}));
            
            
            // psuedo api calls
            // console.log('(request) client_storage :: ' + filename);
            // console.log(base64data);
            // console.log('(apicall) client_storage :: ' + post_storage_data);
            // console.log('(apicall) process_exercise :: ' + post_data);
      }
      else 
      {
        // debug
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
  input: setMobileNet,        // ALERT :: DEPLOT SHORTCUT - change to ResNet50 model
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

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }
}

/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
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
        check_userVoice();

        if (head_bool && leg_bool && user_voice !== 'yes' && user_voice !== 'go' && continue_exercise)
        {
            // ALERT :: TEST SHORTCUT
            play_audio(exerciseMp3, '(voice) ' + exerciseName + ' starting...'); resetTimer(21000);
            // play_audio('./voice/say_yes.mp3', '(voice) say yes'); resetTimer(5000);
            
            is_voice = false;
            beep_mb = false;
            wrong_pose_mb = false;
            completed_mb = false;
            start_record = true;
            waiting_yes_time = Date.now();
            
            if (!is_voice_recognizer_enabled)
            {   
                is_voice_recognizer_enabled = true;
                console.log('(voice_recognizer) :: ENABLED');
            }
        }
        else if (head_bool && leg_bool && user_voice === 'yes' && continue_exercise)
        {
            // pose_bool = posture_right_hands_up(keypoints); // ALERT :: FUTURE DECISION SHORTCUT
            pose_bool = true;
            is_voice = false;
            if (pose_bool)
            {
                beep_mb = play_audio_once('./voice/finish_go_beep.mp3', beep_mb, '(voice) finish go beep');
                setTimeout(recording, 6500);
            }
            else
            {
                wrong_pose_mb = play_audio_once('./voice/wrong_pose.mp3', wrong_pose_mb, '(voice) wrong pose');
            }
        }
        else if (head_bool && leg_bool && user_voice === 'go' && continue_exercise)
        {
            continue_exercise = false;
            completed_mb = play_audio_once('./voice/semi/completed-continue-or-terminate.mp3', completed_mb, '(voice) exercise completed');
            
            if (is_voice_recognizer_enabled) 
            {
                is_voice_recognizer_enabled = false;
                console.log('(voice_recognizer) :: DISABLED');
            }
            checkPoint();
        }
        else
        {
            // continue_exercise = false
            if (is_voice_recognizer_enabled) 
            {
                is_voice_recognizer_enabled = false;
                console.log('(voice_recognizer) :: DISABLED');
            }
        }
// ---------------- territory :: full body check (ends) -----------------------
    });

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}


/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
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
