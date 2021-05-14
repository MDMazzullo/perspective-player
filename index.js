let imgElement = document.querySelector('#imageSrc');
let inputElement = document.querySelector('#fileInput');
let canvas = document.querySelector('#canvasOutput');
let context = canvas.getContext("2d");

// ordered top-left, top-right, bottom-left, bottom-right
let originalCorners = [[0,0],[0,0],[0,0],[0,0]];
let corners = [[0,0],[0,0],[0,0],[0,0]];

let mouseOnCorner = -1;

homographyGrid = document.querySelector('#homography-grid');
homographyGrid.querySelectorAll('.homography-input').forEach((el)=>el.addEventListener('change', (e)=>warpImg(false)));

canvas.addEventListener('mousedown', (e) => {
  // compute if near corner and select corner for drag and drop
  let clickX = e.offsetX;
  let clickY = e.offsetY;
  let closeEnough = 20;
  mouseOnCorner = corners.findIndex((corner)=>{
    return Math.sqrt((corner[0]-clickX)**2 + (corner[1]-clickY)**2) <= closeEnough;
  });
  let center = corners.reduce((corner,center)=>[center[0]+corner[0],center[1]+corner[1]],[0,0]);
  center = [center[0]/4,center[1]/4];
  let minX = Math.min(...corners.map((corner)=>corner[0]))
  let maxX = Math.max(...corners.map((corner)=>corner[0]))
  let minY = Math.min(...corners.map((corner)=>corner[1]))
  let maxY = Math.max(...corners.map((corner)=>corner[1]))
  let isOnImage = minX <= clickX && clickX <= maxX && minY <= clickY && clickY <= maxY;
  if (mouseOnCorner===-1 && isOnImage) {
    mouseOnCorner = 4;
  }
});
canvas.addEventListener('mousemove', (e) => {
  let clickX = e.offsetX;
  let clickY = e.offsetY;
  if (mouseOnCorner > -1) {
    if (mouseOnCorner === 4) {
      corners = corners.map((corner)=> {
        return [corner[0] + e.movementX, corner[1] + e.movementY];
      })
    } else {
      corners[mouseOnCorner] = [clickX,clickY]
    }
    calcMatrix()
  }
});
document.addEventListener('mouseup', (e) => {
  mouseOnCorner = -1;
});

inputElement.addEventListener('change', (e) => {
  imgElement.src = URL.createObjectURL(e.target.files[0]);
}, false);

imgElement.onload = function() {
  let mat = cv.imread(imgElement);
  corners = [[0,0],[imgElement.width,0],[0,imgElement.height],[imgElement.width,imgElement.height]];
  originalCorners = [[0,0],[imgElement.width,0],[0,imgElement.height],[imgElement.width,imgElement.height]];
  mat.delete();
  resetMatrix();
  warpImg(false);
};


function onOpenCvReady() {
  document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
}

function resetMatrix() {
  let inputs = Array.from(homographyGrid.querySelectorAll('.homography-input'));
  inputs[0].value = 1;
  inputs[1].value = 0;
  inputs[2].value = 0;
  inputs[3].value = 0;
  inputs[4].value = 1;
  inputs[5].value = 0;
  inputs[6].value = 0;
  inputs[7].value = 0;
  inputs[8].value = 1;
  corners = [[0,0],[200,0],[0,200],[200,200]];
  warpImg(false);
}

function calcMatrix() {
  let srcPts = cv.matFromArray(4, 2, cv.CV_32FC1, originalCorners.flat());
  let dstPts = cv.matFromArray(4, 2, cv.CV_32FC1, corners.flat());
  let matrix = cv.getPerspectiveTransform(srcPts, dstPts)
  setMatrixValues(matrix);
  srcPts.delete(); dstPts.delete(); matrix.delete();
  warpImg(true);
}

function setMatrixValues(matrix) {
  let inputs = Array.from(homographyGrid.querySelectorAll('.homography-input'));
  inputs[0].value = matrix.doubleAt(0).toFixed(5);
  inputs[1].value = matrix.doubleAt(1).toFixed(5);
  inputs[2].value = matrix.doubleAt(2);
  inputs[3].value = matrix.doubleAt(3).toFixed(5);
  inputs[4].value = matrix.doubleAt(4).toFixed(5);
  inputs[5].value = matrix.doubleAt(5);
  inputs[6].value = matrix.doubleAt(6).toFixed(5);
  inputs[7].value = matrix.doubleAt(7).toFixed(5);
  inputs[8].value = matrix.doubleAt(8);
}

function setCornersFromMatrix(matrix) {
  corners[0][0] = matrix.floatAt(0);
  corners[0][1] = matrix.floatAt(1);
  corners[1][0] = matrix.floatAt(2);
  corners[1][1] = matrix.floatAt(3);
  corners[2][0] = matrix.floatAt(4);
  corners[2][1] = matrix.floatAt(5);
  corners[3][0] = matrix.floatAt(6);
  corners[3][1] = matrix.floatAt(7);
}

function drawCorners() {
  corners.forEach((corner) => {
    x = corner[0];
    y = corner[1];
    context.strokeStyle = "lightgreen";
    context.lineWidth = 3;
    context.moveTo(x, y-10);
    context.lineTo(x, y+10);
    context.moveTo(x-10, y);
    context.lineTo(x+10, y);
    context.stroke();
  })
}

function warpImg(dragCorners) {
  const homography = Array.from(homographyGrid.querySelectorAll('.homography-input')).map((el)=>el.value)
  homography_mat = cv.matFromArray(3, 3, cv.CV_32FC1, homography);
  const { width, height } = canvas.getBoundingClientRect();
  let size = new cv.Size(width, height);
  let src = cv.imread(imgElement);
  let dst = new cv.Mat();
  cv.warpPerspective(src, dst, homography_mat, size, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())
  cv.imshow('canvasOutput', dst);

  if (!dragCorners) {
    let cornersMat = cv.matFromArray(4, 1, cv.CV_32FC2, originalCorners.flat());
    let newCornersMat = new cv.Mat(4, 1, cv.CV_32FC2);
    cv.perspectiveTransform(cornersMat, newCornersMat, homography_mat);
    setCornersFromMatrix(newCornersMat);
    cornersMat.delete(); newCornersMat.delete();
  }

  src.delete(); dst.delete(); homography_mat.delete();
  drawCorners();
}

window.addEventListener('resize', (e)=>{
  warpImg(false)
});