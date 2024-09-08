canvasWidth = 65;  // must be odd
canvasHeight = 2*(canvasWidth>>2)+1;
maxPathDepth = 25000;   //deprecated
wallColor = 0xff000000;
cursorColor = 0xffff00ff;
pathColor = 0;
correctPathColor = 0xff00ffff;
incorrectPathColor = 0;
timerDelay = 0;

carvingStack = [];
carvingVisited = [];
solvingStack = [];
solvingVisited = [];

isComplete = false;
isSolved = false;

statuses = ['Initialized', 'Carving..', 'Stopped Carving', 'Carved', 'Solving..', 'Stopped Solving', 'Solved'];
stat = statuses[0];
var digInterval;
var solveInterval;

var canvas;
var ctx;
var imgData;
var u32;

var xStart;
var yStart;
var xFinish;
var yFinish;

setStatus = (statnum) => {
  stat = statuses[statnum];
  document.getElementById('status').innerHTML = stat;
  switch(stat) {
    case 'Initialized':
      document.getElementById('stop-go-button').innerHTML = 'Carve';
      document.getElementById('step-button').disabled = false;
      break;
    case 'Carving..':
      document.getElementById('stop-go-button').innerHTML = 'Stop';
      document.getElementById('step-button').disabled = true;
      break;
    case 'Stopped Carving':
      document.getElementById('stop-go-button').innerHTML = 'Carve';
      document.getElementById('step-button').disabled = false;
      break;
    case 'Carved':
      document.getElementById('stop-go-button').innerHTML = 'Solve';
      document.getElementById('step-button').disabled = false;
      break;
    case 'Solving..':
      document.getElementById('stop-go-button').innerHTML = 'Stop';
      document.getElementById('step-button').disabled = true;
      break;
    case 'Stopped Solving':
      document.getElementById('stop-go-button').innerHTML = 'Solve';
      document.getElementById('step-button').disabled = false;
      break;
    case 'Solved':
      document.getElementById('stop-go-button').innerHTML = 'Reset';
      document.getElementById('step-button').disabled = true;
      break;
  }
}

stopGo = () => {
  switch(stat) {
    case 'Initialized':
      carve();
      break;
    case 'Carving..':
      clearInterval(digInterval);
      digInterval = null;
      setStatus(2);
      break;
    case 'Stopped Carving':
      carve();
      break;   
    case 'Carved':
      explore();
      break;
    case 'Solving..':
      clearInterval(solveInterval);
      solveInterval = null;
      setStatus(5);
      break;
    case 'Stopped Solving':
      explore();
      break;
    case 'Solved':
      reset();
      break;
  }
}

step = () => {
  switch(stat) {
    case 'Initialized':
      carveStep();
      break;
    case 'Stopped Carving':
      carveStep();
      break;
    case 'Carved':
      exploreStep();
      break;
    case 'Stopped Solving':
      exploreStep();
      break;
  }
}

setSize = (s) => {
  clearInterval(digInterval);
  clearInterval(solveInterval);
  canvasWidth = 2*(Math.floor(9 + (s/100)*(413 - 9))>>1)+1
  canvasHeight = 2*(canvasWidth>>2)+1;
  console.log(canvasWidth);
  reset();
}
setCursorDelay = (d) => {
  timerDelay = (100-d)*10;
  switch(stat) {
    case 'Carving..':
      clearInterval(digInterval);
      digInterval = null;
      carve();
      break;
    case 'Solving..':
      clearInterval(solveInterval);
      solveInterval = null;
      explore();
      break;
  }
}
setWallColor = (c) => {
  wallColor = Number('0x'+c);
  reset();
}
setPathColor = (c) => {
  pathColor = Number('0x'+c);
  reset();
}

reset = () => {
  clearInterval(digInterval);
  clearInterval(solveInterval);
  carvingStack = [];
  carvingVisited = [];
  solvingStack = [];
  solvingVisited = [];

  document.getElementById('maze-size').value = Math.floor(100*canvasWidth/413);
  document.getElementById('cursor-speed').value = 100 - Math.floor(100*timerDelay/10);
  document.getElementById('wall-color').value = wallColor.toString(16).padStart(8, '0');
  document.getElementById('path-color').value = pathColor.toString(16).padStart(8, '0');

  canvas = document.getElementById('myCanvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  ctx = canvas.getContext('2d');
  ctx.fillStyle = `#${
    [
      (wallColor & 0xff).toString(16).padStart(2,0),          //r
      ((wallColor >> 8) & 0xff).toString(16).padStart(2,0),   //g
      ((wallColor >> 16) & 0xff).toString(16).padStart(2,0),  //b
      ((wallColor >> 24) & 0xff).toString(16).padStart(2,0),  //a
    ].join('')
  }`;
  ctx.fillRect(0,0,canvasWidth, canvasHeight);
  imgData = ctx.getImageData(0,0,canvasWidth, canvasHeight).data;
  u32 = new Uint32Array(imgData.buffer);

  setStatus(0);
}

carve = () => {
  setStatus(1);
  if (!carvingStack.length) {
    xStart = 2*Math.floor(Math.random()*(0.5*canvasWidth-1))+1;
    yStart = 2*Math.floor(Math.random()*(0.5*canvasHeight-1))+1;
    carvingStack = [{
      x: xStart, y: yStart, neighbors: [ {x: 2, y: 0}, {x: 0, y: -2}, {x: -2, y: 0}, {x: 0, y: 2} ]
    }];
    carvingVisited = [];
  }
  digInterval = setInterval(() => {
    if (carvingStack.length) {
      dig(u32, carvingVisited, carvingStack);
      ctx.putImageData(new ImageData(new Uint8ClampedArray(imgData.buffer), canvasWidth, canvasHeight), 0, 0);
    } else  {
      clearInterval(digInterval);
      xStart = null;
      yStart = null;
      digInterval = null;
      carvingStack = [];
      carvingVisited = [];
      setStatus(3);
    }
  }, timerDelay);
}

explore = () => {
  setStatus(4);
  if (!solvingStack.length) {
    xStart = 2*Math.floor(Math.random()*(0.5*canvasWidth-1))+1;
    yStart = 2*Math.floor(Math.random()*(0.5*canvasHeight-1))+1;
    
    xFinish = 2*Math.floor(Math.random()*(0.5*canvasWidth-1))+1;
    yFinish = 2*Math.floor(Math.random()*(0.5*canvasHeight-1))+1;
    
    u32[xStart + yStart*canvasWidth] = 0xff0000ff;
    u32[xFinish + yFinish*canvasWidth] = 0xff00ff00;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(imgData.buffer), canvasWidth, canvasHeight), 0, 0);

    solvingStack = [{
      x: xStart, y: yStart, neighbors: [ {x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1} ]
    }];
    solvingVisited = [];
  }
  solveInterval = setInterval(() => {
    if (
      solvingStack.length &&
      !(solvingStack[solvingStack.length-1].x === xFinish && solvingStack[solvingStack.length-1].y === yFinish)
    ) {
      solve(u32, solvingVisited, solvingStack);
      if (solvingStack.length < 4) { u32[xStart + yStart*canvasWidth] = 0xffff0000; } // replace start color hack
      ctx.putImageData(new ImageData(new Uint8ClampedArray(u32.buffer), canvasWidth, canvasHeight), 0, 0);
      
    } else {
      clearInterval(solveInterval);
      solveInterval = null;
      setStatus(6);
    }
  }, timerDelay);
}

carveStep = () => {
  if (!carvingStack.length) {
    xStart = 2*Math.floor(Math.random()*(0.5*canvasWidth-1))+1;
    yStart = 2*Math.floor(Math.random()*(0.5*canvasHeight-1))+1;
    carvingStack = [{
      x: xStart, y: yStart, neighbors: [ {x: 2, y: 0}, {x: 0, y: -2}, {x: -2, y: 0}, {x: 0, y: 2} ]
    }];
    carvingVisited = [];
  }
  dig(u32, carvingVisited, carvingStack);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(imgData.buffer), canvasWidth, canvasHeight), 0, 0);
  if (!carvingStack.length) {
    xStart = null;
    yStart = null;
    carvingStack = [];
    carvingVisited = [];
    setStatus(3);
  }
}

exploreStep = () => {
  if (!solvingStack.length) {
    xStart = 2*Math.floor(Math.random()*(0.5*canvasWidth-1))+1;
    yStart = 2*Math.floor(Math.random()*(0.5*canvasHeight-1))+1;
    
    xFinish = 2*Math.floor(Math.random()*(0.5*canvasWidth-1))+1;
    yFinish = 2*Math.floor(Math.random()*(0.5*canvasHeight-1))+1;
    
    u32[xStart + yStart*canvasWidth] = 0xff0000ff;
    u32[xFinish + yFinish*canvasWidth] = 0xff00ff00;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(imgData.buffer), canvasWidth, canvasHeight), 0, 0);

    solvingStack = [{
      x: xStart, y: yStart, neighbors: [ {x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1} ]
    }];
    solvingVisited = [];
  }
  solve(u32, solvingVisited, solvingStack);
  if (solvingStack.length < 4) { u32[xStart + yStart*canvasWidth] = 0xffff0000; } // replace start color hack
  ctx.putImageData(new ImageData(new Uint8ClampedArray(imgData.buffer), canvasWidth, canvasHeight), 0, 0);
  if ((solvingStack[solvingStack.length-1].x === xFinish && solvingStack[solvingStack.length-1].y === yFinish)) {
    setStatus(6);
  }
}

dig = (imgData, visited, stack) => {
  let state = stack.pop();
  imgData[state.x + state.y*canvasWidth] = cursorColor;  // cursor color
  if (!visited.includes(JSON.stringify({x: state.x, y: state.y}))) { 
    visited.push(JSON.stringify({x: state.x, y: state.y}));
  }
  if (state.neighbors.length) {
    let neighbor = state.neighbors.splice(Math.floor(Math.random()*state.neighbors.length), 1)[0];
    stack.push({
      x: state.x,
      y: state.y,
      neighbors: state.neighbors
    });
    if (!visited.includes(JSON.stringify({x: state.x+neighbor.x, y: state.y+neighbor.y}))) {
      if ((state.x+neighbor.x) > 0 && (state.y+neighbor.y) > 0 && (state.x+neighbor.x) < (canvasWidth-1) && (state.y+neighbor.y) < (canvasHeight-1)) {

        imgData[state.x+(neighbor.x>>1) + (state.y+(neighbor.y>>1))*canvasWidth] = pathColor;
        imgData[state.x + state.y*canvasWidth] = pathColor;
        stack.push({
          x: state.x + neighbor.x,
          y: state.y + neighbor.y,
          neighbors: [ {x: 2, y: 0}, {x: 0, y: -2}, {x: -2, y: 0}, {x: 0, y: 2} ]
        });
      }
    }
  } else {
    imgData[state.x + state.y*canvasWidth] = pathColor;
  }
}

solve = (imgData, visited, stack) => {
  
  let state = stack.pop();
  imgData[state.x + state.y*canvasWidth] = cursorColor;  // cursor color
  if (!visited.includes(JSON.stringify({x: state.x, y: state.y}))) { 
    visited.push(JSON.stringify({x: state.x, y: state.y}));
  }
  if (state.neighbors.length) {
    let neighbor = state.neighbors.splice(Math.floor(Math.random()*state.neighbors.length), 1)[0];
    if (
      !visited.includes(JSON.stringify({x: state.x+neighbor.x, y: state.y+neighbor.y})) &&
      !(imgData[state.x+neighbor.x + (state.y+neighbor.y)*canvasWidth] === wallColor)  // wall color
    ) {
      imgData[state.x + state.y*canvasWidth] = correctPathColor;  // tentatively correct path color
      stack.push({
        x: state.x,
        y: state.y,
        neighbors: state.neighbors
      });
      stack.push({
        x: state.x+neighbor.x, 
        y: state.y+neighbor.y,
        neighbors: [ {x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1} ]
      });
    } else {
      stack.push({
        x: state.x,
        y: state.y,
        neighbors: state.neighbors
      });
    }
  } else {
    imgData[state.x + state.y*canvasWidth] = incorrectPathColor; // incorrect path color
  }

}

// dig = (imgData, x, y, ctx, visited) => {
//   visit = JSON.stringify({x: x, y: y});
//   visited.push(visit);
//   let neighbor;
//   let neighbors = [ {x: 2, y: 0}, {x: 0, y: -2}, {x: -2, y: 0}, {x: 0, y: 2} ];
//   while(neighbors.length) {
//     neighbor = neighbors.splice(Math.floor(Math.random()*neighbors.length), 1)[0];
//     if (!visited.includes(JSON.stringify({x: x+neighbor.x, y: y+neighbor.y}))) {
//       if ((x+neighbor.x) > 0 && (y+neighbor.y) > 0 && (x+neighbor.x) < (canvasWidth-1) && (y+neighbor.y) < (canvasHeight-1)) {

//         imgData[x+(neighbor.x>>1) + (y+(neighbor.y>>1))*canvasWidth] = 0;
//         ctx.putImageData(new ImageData(new Uint8ClampedArray(imgData.buffer), canvasWidth, canvasHeight), 0, 0);

//         dig(imgData, x + neighbor.x, y + neighbor.y, ctx, visited);
//       }
//     }
//   }
// }

// solve = (imgData, ctx, x, y, xFinish, yFinish, visited) => {
//   if (!visited.includes(JSON.stringify({x: xFinish, y: yFinish}))) {
//     visit = JSON.stringify({x: x, y: y});
//     visited.push(visit);
//     //console.log(visited);
//     imgData[x + y*canvasWidth] = 0xff00ffff;
//     ctx.putImageData(new ImageData(new Uint8ClampedArray(imgData.buffer), canvasWidth, canvasHeight), 0, 0);
//     let neighbor;
//     let neighbors = [ {x: 1, y: 0}, {x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 1} ];
//     while (neighbors.length) {
//       neighbor = neighbors.splice(Math.floor(Math.random()*neighbors.length), 1)[0];
//       if (!visited.includes(JSON.stringify({x: x+neighbor.x, y: y+neighbor.y}))) {
//         if (!imgData[x+neighbor.x + (y+neighbor.y)*canvasWidth]) {
//           solve(imgData, ctx, x+neighbor.x, y+neighbor.y, xFinish, yFinish, visited);
//         }
//       }
//     }
//     if (!visited.includes(JSON.stringify({x: xFinish, y: yFinish}))) {
//       imgData[x + y*canvasWidth] = 0xffff00ff;
//       ctx.putImageData(new ImageData(new Uint8ClampedArray(imgData.buffer), canvasWidth, canvasHeight), 0, 0);
//     }
//   }
// }
