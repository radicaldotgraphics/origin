import Lottie from 'lottie-web'
import palettes from './palettes.json'
// import data from './data.json'
import Particles from './particles';
import ThreeScene from './threescene';

let logoAnim = null;
let arrowAnims = [];
const time_ms = 800;
let counter = time_ms-20;
let deviceType = null;
let mouse = {
    direction:null,
    pressing:false,
    curY:null,
    isDown:false,
    dragStarted:false, 
    dragDistance:0
}
let quadrants = {
    rowCount:0,
    colCount:0,
    activeQuadrant:0
}
let docWidth = document.documentElement.clientWidth || docWidth;
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
      deviceType = 'mobile';
}else{
    deviceType='desktop'
    
}
// const semicircle = document.querySelector('#semicircle');
// const semicircleFill = document.querySelector('#semicircleFill');
const headlines = document.querySelectorAll('.headline');
const txtContainer = document.querySelectorAll('.txtContainer');
const explainerTxt = document.querySelectorAll('.explainerTxt');
const withtxt = document.querySelector('#with');
const dlmagic = document.querySelector('#dlmagic')
const rgraphics = document.querySelector('#rgraphics')
const bg = document.querySelector('body')
const prtcls = document.querySelector('#particles')
const overview = document.querySelector('#overview')
const quoteDiv = document.querySelector('#quote')
const services = document.querySelector('#services')
const principles = document.querySelector('#principles')
const threeModel = document.querySelector('#model')
const offeringDivs = document.querySelectorAll('.offering')
const qr = document.querySelector('#qr')
const radrow = document.querySelector(".radicalrow")
const logorowContainer = document.querySelector("#logorowContainer")

const initLottieLogo = () => {
    logoAnim = Lottie.loadAnimation({
        container: document.querySelector("#lottieLogo"),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: "./data.json"
    });
}

const init = () => {
    window.addEventListener( 'touchstart', isTouch );
    window.addEventListener( 'touchend', isUp );
    window.addEventListener( 'mousemove', isMove );
    window.addEventListener( 'touchmove', isMove );
    window.addEventListener( 'resize', doResize )
    window.addEventListener( 'mousedown', isDown )
    window.addEventListener( 'mouseup', isUp )
    
    initLottieLogo();
    initLogoRows();
    initLottieArrows();
    initQuadrants();
    initLines();
    Particles.init();
    ThreeScene.init();

    // setTimeout(Particles.updatePoints, 5000)
    // Particles.updatePoints();
    loop();

}
const initLogoRows = () => {
  for (let i = 2; i <= 4; i++) {
    let itm = radrow.cloneNode(true);
    itm.id = `radicalrow${i}`;
    let shell = itm.querySelector('.logorowShell');
    shell.id=`logorowItm${i}`;
    let l = Math.floor(Math.random()*-100);
    shell.style.left= `${l}px`;
    logorowContainer.appendChild(itm);
  }

}
const initLines = () => {
  let line = document.querySelector(".line");
  // console.log(line);
  for (let i = 0; i < palettes.length; i++) {
    let itm = line.cloneNode(true);
    
    // linecontainer.append(itm)
    line.after(itm)
    // console.log(itm);

  }
}

const initLottieArrows = () => {
  offeringDivs.forEach((itm, i) =>{
    itm.anim = Lottie.loadAnimation({
      container: document.querySelector(`#arrow${i+1}`),
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: "./arrow.json"
  })
    itm.delay = 0;
    itm.scrollpos = 0;
    itm.accelAmt = 0.1;
    arrowAnims.push(itm);
  })
  // const loop = () => {
  //     anim.goToAndPlay(1, true);
  // };
  // anim.addEventListener("loopComplete", loop);
}

const initQuadrants = () => {
    quadrants.rowCount = palettes.length;
    quadrants.w = (docWidth/quadrants.rowCount);
    // console.log(quadrants.w);
    //
    quadrants.calculateQuadrant = (tgt) => {
      // console.log(tgt.clientX);
        let curQuadrant = Math.floor(tgt.clientX/quadrants.w)
        // console.log(curQuadrant, tgt.clientX);
        if(quadrants.activeQuadrant != curQuadrant){
            quadrants.calculateNewPalette(curQuadrant)
            quadrants.activeQuadrant = curQuadrant;
            // Particles.scale= curQuadrant/10;
            // console.log(Particles.scale);
            Particles.initPoints();
            
            let img = document.querySelector("#qr");
            
            
        }
    }
    quadrants.calculateNewPalette = (num) => {
        let colors = palettes[num].colors;
        quadrants.changeAllColors(colors)
    }
    quadrants.changeAllColors = (arr) => {
      let items;
        let num = arr.length;
        bg.style.background = arr[0];
        // semicircleFill.style.fill = arr[0];
        // semicircle.style.fill = arr[arr.length-1];
        // prtcls.style.background = arr[0];
        // prtcls.style.background = arr[arr.length-1];
        if(num>2){
          headlines.forEach((e)=>{
            e.style.background = arr[1]
          })
         
          withtxt.style.color = arr[1]
          withtxt.style.background = arr[2]
          dlmagic.style.color = arr[2];
          rgraphics.style.color = arr[0];
          overview.style.color = arr[0];
          quoteDiv.style.color = arr[0];
          services.style.color = arr[0];
          principles.style.color = arr[0];
        }else{
          headlines.forEach((e)=>{
            e.style.background = arr[0]
          })
          withtxt.style.color = arr[0]
          withtxt.style.background = arr[1]
          dlmagic.style.color = arr[1];
          rgraphics.style.color = arr[1];
          overview.style.color = arr[1];
          quoteDiv.style.color = arr[1];
          services.style.color = arr[1];
          principles.style.color = arr[1];
          
        }
        let itms = lines.querySelectorAll(".line")
        itms.forEach((itm) => {
          itm.style.fill = arr[arr.length-1];
        })
        explainerTxt.forEach((txt) => {

          // txt.style.background = arr[0];
          txt.style.color = arr[arr.length-1];
        })
        txtContainer.forEach((itm) => {

          itm.style.background = arr[0];
        })
        Particles.clr = arr[1];
        ThreeScene.changeColor(arr[1])
        qr.style.webkitFilter = `drop-shadow(100em 0 0px ${arr[1]} )`;
        //from 2-10 colors
        switch (num) {
        case 2:
          //color[0] is bg so the array values starts at array[1] and ends at case [n-1]
            items = document.getElementsByClassName('stroke1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
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
          items = document.getElementsByClassName('stroke1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }

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
          items = document.getElementsByClassName('stroke1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[2];
            }

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
          items = document.getElementsByClassName('stroke1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[2];
            }
            items = document.getElementsByClassName('stroke3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[3];
            }

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
          items = document.getElementsByClassName('stroke1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[2];
            }
            items = document.getElementsByClassName('stroke3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[3];
            }

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
          items = document.getElementsByClassName('stroke1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[2];
            }
            items = document.getElementsByClassName('stroke3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[3];
            }

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
          items = document.getElementsByClassName('stroke1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[2];
            }
            items = document.getElementsByClassName('stroke3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[3];
            }

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
          items = document.getElementsByClassName('stroke1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[2];
            }
            items = document.getElementsByClassName('stroke3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[3];
            }

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
          items = document.getElementsByClassName('stroke1');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[1];
            }
            items = document.getElementsByClassName('stroke2');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[2];
            }
            items = document.getElementsByClassName('stroke3');
            for(let i = 0; i < items.length; i++) {
              items[i].style.stroke = arr[3];
            }
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
const isTouch = ( e ) => {
  mouse.isDown=true;
  Particles.isDown=true;
  isMove(e)
}
const isDown = ( e ) => {
  mouse.isDown=true;
  Particles.isDown=true;
}
const isUp = ( e ) => {
  Particles.isDown=false;
  mouse.isDown=false;

}
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
    if(mouse.x>docWidth || mouse.x <= 0){
        return;
    }
    quadrants.calculateQuadrant(tgt);
  
}

let doResize = () => {
    initQuadrants();
}

let checkIfVisible = () =>{
  let obj = prtcls.getBoundingClientRect();
  let hmax = window.innerHeight;  
  let hmin = 0;
  if (obj.top < hmax && obj.bottom > hmin){
    // console.log("visiblee", obj.top);
    Particles.tick()
  }
  obj = threeModel.getBoundingClientRect();
  if (obj.top < hmax && obj.bottom > hmin){
    // console.log("three", obj.top);
    ThreeScene.tick()
  } 
  arrowAnims.forEach((itm,i) =>{
    
    obj = itm.getBoundingClientRect();
      // console.log(obj.top+obj.height)
      if (obj.top < hmax && obj.bottom > hmin){
        let pct = 0.9-(obj.top/hmax);
        let frames = itm.anim.totalFrames;
        itm.delay+=(pct-itm.delay)*itm.accelAmt;
        let f = Math.min(Math.floor(itm.delay*frames), frames);
        // itm.anim.goToAndStop(f, true);
        // console.log(f);
        itm.anim.goToAndStop(f, true);
        // console.log("visible", ((obj.bottom-obj.height)/hmax), itm);
      } 
  })
    
}
let loop = () => {
    counter++;
    if (counter>time_ms){
        counter = 0;
        let rand = Math.floor(Math.floor(Math.random()*docWidth)/quadrants.w)
        if(quadrants.activeQuadrant != rand){
            quadrants.calculateNewPalette(rand)
            quadrants.activeQuadrant = rand;
        }
      }
    checkIfVisible();
    requestAnimationFrame(loop);
}


init();
