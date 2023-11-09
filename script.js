// import ThreeScene from './threescene'
import Lottie from 'lottie-web'
import palettes from './palettes.json'
import data from './data.json'

let anim = null;
let counter = 0;
let bg = null;
let deviceType = null;
let mouse = {
    direction:null,
    pressing:false,
    curY:null,
    isClicking:false,
    dragStarted:false, 
    dragDistance:0
}
let quadrants = {
    rowCount:0,
    colCount:0,
    activeQuadrant:0
}
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
      deviceType = 'mobile';
}else{
    deviceType='desktop'
    
}
let canvas = document.querySelector('#lines');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let ctx = canvas.getContext('2d');


const initLottie = () => {
    anim = Lottie.loadAnimation({
        container: document.getElementById("lottie"),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: "./data.json"
        // path: "./data.json"
    });
    // let loop = () => {

    //     anim.goToAndPlay(1, true);
    // };
    // anim.addEventListener("loopComplete", loop);
}


let init = () => {
    // window.addEventListener( 'touchstart', isDown );
    // window.addEventListener( 'mousedown', isDown ); 
    // window.addEventListener( 'mouseup', isUp );
    // window.addEventListener( 'touchend', isUp );
    window.addEventListener( 'mousemove', isMove );
    window.addEventListener( 'touchmove', isMove );
    window.addEventListener( 'resize', doResize )
    bg = document.getElementById('container')
    initLottie();
    initQuadrants();
    initCanvas()
    loop()

}
const initCanvas = () => {
    const lineCount = palettes.length;
    const width = window.innerWidth/lineCount;
    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = "exclusion";
    for (let i = 0; i < palettes.length; i++) {
        const itm = palettes[i];
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.rect(width*i, 0, 0.2, window.innerHeight)
        ctx.fill();
        
    }

}

const initQuadrants = () => {
    quadrants.rowCount = palettes.length;
    quadrants.colCount = 10;
    quadrants.rowWidth = window.innerWidth/quadrants.rowCount;
    quadrants.rowHeight = window.innerHeight/quadrants.colCount;
    quadrants.calculateQuadrant = (tgt) => {
        let curQuadrant = Math.floor(tgt.clientX/quadrants.rowWidth)
        if(quadrants.activeQuadrant != curQuadrant){
            quadrants.updateColorScheme(curQuadrant)
            quadrants.activeQuadrant = curQuadrant;
        }
    }
    quadrants.updateColorScheme = (num) => {
        // console.log(palettes[num])
        let colors = palettes[num].colors;
        // console.log(colors[0], bg);
        quadrants.defineColorScheme(colors)

    }
    quadrants.defineColorScheme = (arr) => {
        let items;
        let num = arr.length;
        // console.log(arr.length);
        bg.style.background = arr[0];
        //from 2-10 colors
        switch (num) {
        case 2:
          //color[0] is bg so the array values starts at array[1] and ends at case [n-1]
            items = document.getElementsByClassName('color1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color4');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color5');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color6');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color7');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color8');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color9');
            for(let i = 0; i < items.length; i++) {
                items[i].classList.remove("show");
            }
            items="";
            // items = document.getElementsByClassName('colorReveal');
            // for(let i = 0; i < items.length; i++) {
            //   items[i].style.fill = arr[0];
            // }
            break;
        case 3:
            items = document.getElementsByClassName('color1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color4');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color5');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color6');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color7');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color8');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color9');
            for(let i = 0; i < items.length; i++) {
                items[i].classList.remove("show");

                items="";
            }
            // items = document.getElementsByClassName('colorReveal');
            // for(let i = 0; i < items.length; i++) {
            //   items[i].style.fill = arr[0];
            // }
            break;
        case 4:
            items = document.getElementsByClassName('color1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color4');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color5');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color6');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color7');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color8');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color9');
            for(let i = 0; i < items.length; i++) {
                items[i].classList.remove("show");
            }
            items="";
            // items = document.getElementsByClassName('colorReveal');
            // for(let i = 0; i < items.length; i++) {
            //   items[i].style.fill = arr[3];
            // }
            break;
        case 5:
            items = document.getElementsByClassName('color1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color4');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color5');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color6');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color7');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color8');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color9');
            for(let i = 0; i < items.length; i++) {
                items[i].classList.remove("show");
            }
            items="";
            // items = document.getElementsByClassName('colorReveal');
            // for(let i = 0; i < items.length; i++) {
            //   items[i].style.fill = arr[3];
            // }
            break;
        case 6:
            items = document.getElementsByClassName('color1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color4');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color5');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color6');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color7');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color8');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[5];
            }
            items="";
            items = document.getElementsByClassName('color9');
            for(let i = 0; i < items.length; i++) {
                items[i].classList.remove("show");
            }
            items="";
            // items = document.getElementsByClassName('colorReveal');
            // for(let i = 0; i < items.length; i++) {
            //   items[i].style.fill = arr[4];
            // }
            break;
        case 7:
            items = document.getElementsByClassName('color1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color4');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color5');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color6');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color7');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[5];
            }
            items="";
            items = document.getElementsByClassName('color8');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[6];
            }
            items="";
            items = document.getElementsByClassName('color9');
            for(let i = 0; i < items.length; i++) {
                items[i].classList.remove("show");
            }
            items="";
            // items = document.getElementsByClassName('colorReveal');
            // for(let i = 0; i < items.length; i++) {
            //   items[i].style.fill = arr[1];
            // }
            break;
        case 8:
            items = document.getElementsByClassName('color1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color4');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color5');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color6');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[5];
            }
            items="";
            items = document.getElementsByClassName('color7');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[6];
            }
            items="";
            items = document.getElementsByClassName('color8');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[7];
            }
            items="";
            items = document.getElementsByClassName('color9');
            for(let i = 0; i < items.length; i++) {
                items[i].classList.remove("show");
            }
            items="";
            // items = document.getElementsByClassName('colorReveal');
            // for(let i = 0; i < items.length; i++) {
            //   items[i].style.fill = arr[8];
            // }
            break;
        case 9:
            items = document.getElementsByClassName('color1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color4');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color5');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[5];
            }
            items="";
            items = document.getElementsByClassName('color6');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[6];
            }
            items="";
            items = document.getElementsByClassName('color7');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[7];
            }
            items="";
            items = document.getElementsByClassName('color8');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[8];
            }
            items="";
            items = document.getElementsByClassName('color9');
            for(let i = 0; i < items.length; i++) {
                items[i].classList.remove("show"); 
            }
            items="";
            // items = document.getElementsByClassName('colorReveal');
            // for(let i = 0; i < items.length; i++) {
            //   items[i].style.fill = arr[5];
            // }
            break;
        case 10:
            items = document.getElementsByClassName('color1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[1];
            }
            items="";
            items = document.getElementsByClassName('color2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[2];
            }
            items="";
            items = document.getElementsByClassName('color3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[3];
            }
            items="";
            items = document.getElementsByClassName('color4');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[4];
            }
            items="";
            items = document.getElementsByClassName('color5');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[5];
            }
            items="";
            items = document.getElementsByClassName('color6');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[6];
            }
            items="";
            items = document.getElementsByClassName('color7');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[7];
            }
            items="";
            items = document.getElementsByClassName('color8');
            for(let i = 0; i < items.length; i++) {
              items[i].style.fill = arr[8];
            }
            items="";
            items = document.getElementsByClassName('color9');
            for(let i = 0; i < items.length; i++) {
                items[i].classList.add("show"); 
              items[i].style.fill = arr[9];
              items="";
            }
            // items = document.getElementsByClassName('colorReveal');
            // for(let i = 0; i < items.length; i++) {
            //   items[i].style.fill = arr[9];
            // }
            break;
        default:
            break;
       }
    }

}

const isDown = ( e ) => {
    // // console.log("donw");
    // mouse.pressing=true;
    // let tgt = "";
    // if (deviceType == "mobile") {
    //     tgt = e.targetTouches[0]
    // } else {
    //     tgt = e;
    // }
    // mouse.x = tgt.clientX;
    // mouse.y = tgt.clientY;
//
}
const isUp = ( e ) => {
    // console.log("uppp");
    // mouse.pressing = false;
    // mouse.isClicking = false;
    // mouse.direction = null;
    // if(mouse.dragStarted){
    //     mouse.dragStarted=false;

    // }

}
//
const isMove = ( e ) => {
    // console.log("isMove");
    counter=0;
    let tgt = "";
    if (deviceType == "mobile") {
        tgt = e.targetTouches[0]
    } else {
        tgt = e;
    }
    mouse.x= tgt.clientX;
    mouse.y= tgt.clientY;
    if(mouse.x>window.innerWidth || mouse.x <= 0){
        return;
    }
    quadrants.calculateQuadrant(tgt);
    // console.log(mouse.y);
    // if(mouse.pressing && mouse.isClicking){
    //     e.preventDefault();
       
    //     if(mouse.curY==null){
    //         //first click
    //     }else if(mouse.curY>tgt.clientY){
    //         // console.log("moving up");
    //         mouse.direction = "up";            
    //     }else if(mouse.curY<tgt.clientY){
    //         // console.log("moving down");
    //         if(mouse.direction!="down"){
    //             mouse.direction = "down";
    //             mouse.dragDistance = 0;
    //         }else{
    //             //already moving down, lets move the lever
    //             let dist = tgt.clientY-mouse.curY;
    //             mouse.dragStarted = true;
    //             mouse.dragDistance+=dist;
    //             let r = Math.min(2, (mouse.dragDistance/100)+1)
    //         }
    //     }
    //     mouse.curY = tgt.clientY;
            
    // }else{
    //     mouse.mouseDirection=null;
    //     mouse.curY=null;
    //     return;       
    // }
}

let doResize = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    initQuadrants();
    initCanvas()
}

let loop = () => {
    counter++;
    if (counter>800){
        counter = 0;
        let rand = Math.floor(Math.floor(Math.random()*window.innerWidth)/quadrants.rowWidth)
        // console.log(rand)
        
        if(quadrants.activeQuadrant != rand){
            quadrants.updateColorScheme(rand)
            quadrants.activeQuadrant = rand;
        }

    }
    // console.log(counter);
    requestAnimationFrame(loop);
}

init();