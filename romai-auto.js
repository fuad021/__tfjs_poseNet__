// ===============================================================================
//                      NEW TFJS SPEECH COMMAND RECOGNIZER
// ===============================================================================
let recognizer;
let global_recognizer = '';
let is_enabled = true;

function predictWord() {
    const words = recognizer.wordLabels();
    const threshold = 0.97;
    var score = -1;
    var yes_score = -1;
    var stop_score = -1;
    var time = Date.now();
    var time_th = 1500;
    
    recognizer.listen(({scores}) => {
        scores = Array.from(scores).map((s, i) => ({score: s, word: words[i]}));

        // _background_noise_, _unknown_, down, eight, five, four, go, left,
        // nine, no, one, right, seven, six, stop, three, two, up, yes, zero
        
        yes_score = scores[18].score;
        stop_score = scores[14].score;
        if (stop_score > yes_score && stop_score > threshold && time + time_th < Date.now())
        {
            time = Date.now();
            global_recognizer = scores[14].word;
            console.log('(predictWord) CAPTURED :: ' + global_recognizer);
            score = stop_score;
        }
        else if (stop_score < yes_score && yes_score > threshold && time + time_th < Date.now())
        {
            time = Date.now();
            global_recognizer = scores[18].word;
            console.log('(predictWord) CAPTURED :: ' + global_recognizer);
            score = yes_score;
        }
    }, {probabilityThreshold: threshold});
}

async function voice_recognizer_app()
{
    recognizer = speechCommands.create('BROWSER_FFT');
    await recognizer.ensureModelLoaded();
    predictWord();
}

voice_recognizer_app();
// ================================================================================

// ================================================================================
//                                API VARIABLES
// ================================================================================
let patientId = uuidv4();
let testId = 'TEST-01';
let tenant = 'telemeddev';
let height = 76;
let exerciseName = 'chinToChest';   // ALERT
let queue_result = [];
const queue_url = 'https://romai.injurycloud.com/queue_status/?testId='+ testId +'&tenant='+ tenant +'&patientId=' + patientId
function queue_api_call() {
  fetch(queue_url)
      .then((resp) => resp.json())
      .then(function(data) {let queue = data.queue; if(queue.length){queue.forEach(print_queue)}})
      .catch(function(error) {console.log(error)});
}
const queue_checker = setInterval(queue_api_call, 10000);
// ================================================================================

const red = '#d2222d';
const yellow = '#ffbf00';
const green = '#238823';
const white = '#ffffff';
const black = '#000000';

let color = red;
let old_color = red;

const boundingBoxColor = red;
const lineWidth = 12;
const pointRadius = 12;

// for pose adjustment (threshold)
const x_adjust = 21;
const y_adjust = 21;

let is_posture_colorization = true;

// mb :: message_bool
let welcome_mb = false;
let beep_mb = false;
let wrong_pose_mb = false;
let completed_mb = false;

let all_keys = 'NO KEYS YET';

let frame_count = 1;
let confidence_score = 0.1;

let head_bool = false;
let leg_bool = false;

let user_voice = 'noise';
let noise_captured = 'noise';
let is_voice = true;

let curr_time = Date.now();
let waiting_yes_time = Date.now();
let yes_triggered = 99999;

let interval = 10000;
let checker = setInterval(checkPoint, interval);

let chunks = [];
let if_record = true;
let start_record = true;
let mediaRecorder = 'not init';

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
      a1.href = "https://romai.injurycloud.com/" + item.request_output.raw_video;
      a1.target = "_blank"

      a2.appendChild(link2);
      a2.title = "rendered_picture";  
      a2.href = "https://romai.injurycloud.com/" + item.request_output.rendered_picture;
      a2.target = "_blank"

      a3.appendChild(link3);
      a3.title = "rendered_video";  
      a3.href = "https://romai.injurycloud.com/" + item.request_output.rendered_video;
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




// unique identifier
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// blob to base64
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onloadend = function() {resolve(reader.result); }
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

function recording()
{
    if (if_record)
    {
        if (user_voice === 'yes' && start_record)
        {
            mediaRecorder.start();
            console.log('RECORDING (starts) - state :: ' + mediaRecorder.state);
            start_record = false;
        }
        else if (user_voice === 'stop')
        {
            if_record = false;
            mediaRecorder.stop();
            console.log('RECORDING (finished) - state ::', mediaRecorder.state);
        }
    }
    else 
    {
        // console.log('(bool) if_record :: ', if_record);
    }
}

function retreat()
{
    clearInterval(checker);
    window.user_voice_captured = function() {};
    // throw new Error('PROGRAM TERMINATING...');
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
        
        console.log("triggering checkPoint @ " + (Date.now() - curr_time));
        curr_time = Date.now();
        
        is_voice = true;
        if (!head_bool)
        {
            user_voice = 'noise';
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
  // if (keypoints[3].score < confidence_score) // surreal
  if (keypoints[15].score < confidence_score && keypoints[16].score < confidence_score)     // ALERT :: TEST SHORTCUT
      return false;
  else
      return true;
}


// ISSUE OVERLAPPING
function user_voice_captured() 
{    
    if ((waiting_yes_time + 21000) < Date.now() && user_voice === 'yes') 
    {
        user_voice = 'noise';
        console.log('#### YES TIMEOUT #### :: ' + (Date.now() - waiting_yes_time));
        beep_mb = false;
        wrong_pose_mb = false;
        completed_mb = false;
        
        mediaRecorder.stop();
        chunks = [];        
        console.log('RECORDING (deleted) - state ::', mediaRecorder.state);
    }
    
    if (global_recognizer !== user_voice)
    {
        if ((global_recognizer === 'yes' || global_recognizer === 'stop') && user_voice !== global_recognizer) 
        {
            yes_triggered = Date.now() - waiting_yes_time;
            waiting_yes_time = Date.now();
            
            user_voice = global_recognizer;
            console.log('(assigned) CAPTURED USER_VOICE :: ' + user_voice);
            global_recognizer = '';
            
            if (user_voice === 'yes') if_record = true;
            
            // IMPROVEMENT ISSUE :: for timelimitting yes command
            /*
            if (yes_triggered < 5000)
            {
                user_voice = global_recognizer;
                console.log('(assigned) CAPTURED USER_VOICE :: ' + user_voice + ' at time :: ' + yes_triggered);
                global_recognizer = 'noise';
            }
            else
            {
                console.log('(not assigned) CAPTURE TIMEOUT :: ' + global_recognizer + ' at time :: ' + yes_triggered);
            }
            */

        }
        else if (noise_captured !== global_recognizer && (global_recognizer !== 'yes' || global_recognizer !== 'stop'))
        {
            noise_captured = global_recognizer;
            console.log('(not assigned) CAPTURED NOISE :: ' + noise_captured);
        }
    }
}

// ========================================================================================================
//                                            data_util.js
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

function front_straight(keypoints, x_adjust, y_adjust)
{
  var points = getPoints(keypoints);
  var x = points[0];
  var y = points[1];
    
  console.log("FALSE");
  old_color = red;
  if (Math.abs(y[1] - y[2]) < y_adjust && 
      Math.abs(y[3] - y[4]) < y_adjust &&
      Math.abs(y[5] - y[6]) < y_adjust &&
      Math.abs(y[11] - y[12]) < y_adjust*3 &&
      y[9] > y[7] && y[10] > y[8] &&
      
      Math.abs(x[5] - x[7]) < x_adjust && 
      Math.abs(x[7] - x[9]) < x_adjust &&
      Math.abs(x[6] - x[8]) < x_adjust &&
      Math.abs(x[8] - x[10]) < x_adjust &&

      Math.abs(x[11] - x[13]) < x_adjust && 
      Math.abs(x[13] - x[15]) < x_adjust &&
      Math.abs(x[12] - x[14]) < x_adjust &&
      Math.abs(x[14] - x[16]) < x_adjust) 
      {
        console.log("TRUE");
        old_color = black;
      }
}

function side_straight(x_s, y_s, x_adjust, y_adjust) 
{
  var flag = false;
  if (Math.abs(x[5] - x[6]) < x_adjust && 
      Math.abs(y[5] - y[6]) < y_adjust &&
      Math.abs(x[11] - x[12]) < x_adjust && 
      Math.abs(y[11] - y[12]) < y_adjust) 
      {
        flag = true;
        if (x[0] < x[6]) console.log("FRONT");
        if (x[0] > x[5]) console.log("BACK");
      }
  return flag;
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


/**
 * Draw pose keypoints onto a canvas
 */

let posture = "frontface";

function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {

  /*
   * POSTURE-WISE COLOR CHANGE
  switch (posture)
  {
    case "frontface":
      if(front_straight(x_s, y_s, x_adjust, y_adjust)) color = green;
      else color = red;
      break;
    case "sideface":
      if(side_straight(x_s, y_s, x_adjust, y_adjust)) color = green;
      else color = red;
      break;
  }
  */
  
  /* POSTURE COLORIZATION :: FULL BODY CHECK
  if (is_posture_colorization)
  {
    res = fullBodyCheckConfCount(keypoints, minConfidence);
    if (res > 15) color = green;
    else color = red;
  }
  */
  
  // POSTURE COLORIZATION :: SIDE FACE              // NEW DEFINITION
    if (is_posture_colorization)
    {
        var points = getPoints(keypoints);
        var x = points[0];
        var y = points[1];
        
        if ((Math.abs(x[5] - x[6]) < x_adjust*2) && (Math.abs(x[11] - x[12]) < x_adjust*2)) 
            color = green;
        else color = red;
    }

  
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

const tryResNetButtonName = 'tryResNetButton';
const tryResNetButtonText = '[New] Try ResNet50';
const tryResNetButtonTextCss = 'width:100%;text-decoration:underline;';
const tryResNetButtonBackgroundCss = 'background:#e61d5f;';

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

function setDatGuiPropertyCss(propertyText, liCssString, spanCssString = '') {
  var spans = document.getElementsByClassName('property-name');
  for (var i = 0; i < spans.length; i++) {
    var text = spans[i].textContent || spans[i].innerText;
    if (text == propertyText) {
      spans[i].parentNode.parentNode.style = liCssString;
      if (spanCssString !== '') {
        spans[i].style = spanCssString;
      }
    }
  }
}

function updateTryResNetButtonDatGuiCss() {
  setDatGuiPropertyCss(
      tryResNetButtonText, tryResNetButtonBackgroundCss,
      tryResNetButtonTextCss);
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

/**
 * Converts an arary of pixel data into an ImageData object
 */
async function renderToCanvas(a, ctx) {
  const [height, width] = a.shape;
  const imageData = new ImageData(width, height);

  const data = await a.data();

  for (let i = 0; i < height * width; ++i) {
    const j = i * 4;
    const k = i * 3;

    imageData.data[j + 0] = data[k + 0];
    imageData.data[j + 1] = data[k + 1];
    imageData.data[j + 2] = data[k + 2];
    imageData.data[j + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw an image on a canvas
 */
function renderImageToCanvas(image, size, canvas) {
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);
}

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
//                                                camera.js
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
      
// ---------------- record exercise starts -----------------------
      mediaRecorder = new MediaRecorder(mediaStreamObj);
      
      mediaRecorder.ondataavailable = function(ev) {
          chunks.push(ev.data);
      }
      
      mediaRecorder.onstop = async function(ev) {
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
          
            // api calls
            
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
            /*
            console.log('(request) client_storage :: ' + filename);
            console.log('(request) blobBase64 :: ' + base64data.substring(0, 121));
            console.log('(typeof) base64data :: ' + typeof base64data);
            console.log('(apicall) client_storage :: ' + post_storage_data);
            console.log('(apicall) process_exercise :: ' + post_data);
            */
      }
// ---------------- record exercise ends -----------------------

      
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
  input: setResNet,        // DEPLOY SHORTCUT :: change to ResNet50 model
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

// ISSUE :: hide panel 
/* 
  const gui = new dat.GUI({width: 300});

  let architectureController = null;
  guiState[tryResNetButtonName] = function() {
    architectureController.setValue('ResNet50')
  };
  gui.add(guiState, tryResNetButtonName).name(tryResNetButtonText);
  updateTryResNetButtonDatGuiCss();

  // The single-pose algorithm is faster and simpler but requires only one
  // person to be in the frame or results will be innaccurate. Multi-pose works
  // for more than 1 person
  const algorithmController =
      gui.add(guiState, 'algorithm', ['single-pose', 'multi-pose']);

  // The input parameters have the most effect on accuracy and speed of the
  // network
  let input = gui.addFolder('Input');
  // Architecture: there are a few PoseNet models varying in size and
  // accuracy. 1.01 is the largest, but will be the slowest. 0.50 is the
  // fastest, but least accurate.
  architectureController =
      input.add(guiState.input, 'architecture', ['MobileNetV1', 'ResNet50']);
  guiState.architecture = guiState.input.architecture;
  // Input resolution:  Internally, this parameter affects the height and width
  // of the layers in the neural network. The higher the value of the input
  // resolution the better the accuracy but slower the speed.
  let inputResolutionController = null;
  function updateGuiInputResolution(
      inputResolution,
      inputResolutionArray,
  ) {
    if (inputResolutionController) {
      inputResolutionController.remove();
    }
    guiState.inputResolution = inputResolution;
    guiState.input.inputResolution = inputResolution;
    inputResolutionController =
        input.add(guiState.input, 'inputResolution', inputResolutionArray);
    inputResolutionController.onChange(function(inputResolution) {
      guiState.changeToInputResolution = inputResolution;
    });
  }

  // Output stride:  Internally, this parameter affects the height and width of
  // the layers in the neural network. The lower the value of the output stride
  // the higher the accuracy but slower the speed, the higher the value the
  // faster the speed but lower the accuracy.
  let outputStrideController = null;
  function updateGuiOutputStride(outputStride, outputStrideArray) {
    if (outputStrideController) {
      outputStrideController.remove();
    }
    guiState.outputStride = outputStride;
    guiState.input.outputStride = outputStride;
    outputStrideController =
        input.add(guiState.input, 'outputStride', outputStrideArray);
    outputStrideController.onChange(function(outputStride) {
      guiState.changeToOutputStride = outputStride;
    });
  }

  // Multiplier: this parameter affects the number of feature map channels in
  // the MobileNet. The higher the value, the higher the accuracy but slower the
  // speed, the lower the value the faster the speed but lower the accuracy.
  let multiplierController = null;
  function updateGuiMultiplier(multiplier, multiplierArray) {
    if (multiplierController) {
      multiplierController.remove();
    }
    guiState.multiplier = multiplier;
    guiState.input.multiplier = multiplier;
    multiplierController =
        input.add(guiState.input, 'multiplier', multiplierArray);
    multiplierController.onChange(function(multiplier) {
      guiState.changeToMultiplier = multiplier;
    });
  }

  // QuantBytes: this parameter affects weight quantization in the ResNet50
  // model. The available options are 1 byte, 2 bytes, and 4 bytes. The higher
  // the value, the larger the model size and thus the longer the loading time,
  // the lower the value, the shorter the loading time but lower the accuracy.
  let quantBytesController = null;
  function updateGuiQuantBytes(quantBytes, quantBytesArray) {
    if (quantBytesController) {
      quantBytesController.remove();
    }
    guiState.quantBytes = +quantBytes;
    guiState.input.quantBytes = +quantBytes;
    quantBytesController =
        input.add(guiState.input, 'quantBytes', quantBytesArray);
    quantBytesController.onChange(function(quantBytes) {
      guiState.changeToQuantBytes = +quantBytes;
    });
  }

  function updateGui() {
    if (guiState.input.architecture === 'MobileNetV1') {
      updateGuiInputResolution(
          defaultMobileNetInputResolution,
          [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800]);
      updateGuiOutputStride(defaultMobileNetStride, [8, 16]);
      updateGuiMultiplier(defaultMobileNetMultiplier, [0.50, 0.75, 1.0]);
    } else {  // guiState.input.architecture === "ResNet50"
      updateGuiInputResolution(
          defaultResNetInputResolution,
          [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800]);
      updateGuiOutputStride(defaultResNetStride, [32, 16]);
      updateGuiMultiplier(defaultResNetMultiplier, [1.0]);
    }
    updateGuiQuantBytes(defaultQuantBytes, [1, 2, 4]);
  }

  updateGui();
  input.open();
  // Pose confidence: the overall confidence in the estimation of a person's
  // pose (i.e. a person detected in a frame)
  // Min part confidence: the confidence that a particular estimated keypoint
  // position is accurate (i.e. the elbow's position)
  let single = gui.addFolder('Single Pose Detection');
  single.add(guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0);
  single.add(guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0);

  let multi = gui.addFolder('Multi Pose Detection');
  multi.add(guiState.multiPoseDetection, 'maxPoseDetections')
      .min(1)
      .max(20)
      .step(1);
  multi.add(guiState.multiPoseDetection, 'minPoseConfidence', 0.0, 1.0);
  multi.add(guiState.multiPoseDetection, 'minPartConfidence', 0.0, 1.0);
  // nms Radius: controls the minimum distance between poses that are returned
  // defaults to 20, which is probably fine for most use cases
  multi.add(guiState.multiPoseDetection, 'nmsRadius').min(0.0).max(40.0);
  multi.open();

  let output = gui.addFolder('Output');
  output.add(guiState.output, 'showVideo');
  output.add(guiState.output, 'showSkeleton');
  output.add(guiState.output, 'showPoints');
  output.add(guiState.output, 'showBoundingBox');
  output.open();


  architectureController.onChange(function(architecture) {
    // if architecture is ResNet50, then show ResNet50 options
    updateGui();
    guiState.changeToArchitecture = architecture;
  });

  algorithmController.onChange(function(value) {
    switch (guiState.algorithm) {
      case 'single-pose':
        multi.close();
        single.open();
        break;
      case 'multi-pose':
        single.close();
        multi.open();
        break;
    }
  });
*/

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
      
// ======================================================================================================================================
        frame_count = frame_count + 1;
        welcome_mb = play_audio_once('./voice/welcome.mp3', welcome_mb, '(voice) Welcome to my medical hub');
        
        user_voice_captured();
        
        if (head_bool && leg_bool && user_voice !== 'yes' && user_voice !== 'stop')
        {
            play_audio('./voice/fullbodyPos_chin2chestStart.mp3', '(voice) Full body captured. Now we will start chin to chest exercise. Stand side to the camera. Your whole body needs to be seen. When ready say YES'); resetTimer(20000); 
            // play_audio('./voice/say_yes.mp3', '(voice) When ready say YES'); resetTimer(5000); // TEST
            is_voice = false;
            beep_mb = false;
            wrong_pose_mb = false;
            completed_mb = false;
            start_record = true;
            waiting_yes_time = Date.now();
            
            if (!is_enabled)
            {
                async function voice_recognizer_app()
                {
                    recognizer = speechCommands.create('BROWSER_FFT');
                    await recognizer.ensureModelLoaded();
                    predictWord();
                }
                
                is_enabled = true;
                voice_recognizer_app();
                console.log('ENABLED :: voice_recognizer_app');
            }
        }
        else if (head_bool && leg_bool && user_voice === 'yes')
        {
            // pose_bool = posture_right_hands_up(keypoints); // FUTURE
            pose_bool = true;
            is_voice = false;
            if (pose_bool)
            {
                beep_mb = play_audio_once('./voice/finish_say_stop.mp3', beep_mb, '(voice) Please start the exercise after listening to the BEEP sound. When finished, say, STOP');
                setTimeout(recording, 6500);
            }
            else
            {
                wrong_pose_mb = play_audio_once('./voice/wrong_pose.mp3', wrong_pose_mb, '(voice) You are in a wrong pose. Please stand according to given instructions.');
            }
        }
        else if (head_bool && leg_bool && user_voice === 'stop')
        {
            is_voice = false;
            completed_mb = play_audio_once('./voice/successfully_completed.mp3', completed_mb, '(voice) You have successfully completed the exercise.');
            retreat();
        }
        else
        {
            // disabling voice_recognizer
            if (is_enabled) 
            {
                is_enabled = false;
                window.voice_recognizer_app = function() {};
                console.log('DISABLED :: voice_recognizer_app');
            }
        }
// ======================================================================================================================================
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
    info.textContent = 'this browser does not support video capture,' +
        'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  setupGui([], net);
  detectPoseInRealTime(video, net);
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

bindPage();
