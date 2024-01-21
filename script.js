import Lottie from 'lottie-web'
import palettes from './palettes.json'
// import data from './data.json'
import Particles from './particles';
import ThreeScene from './threescene';

let firstTime=true;
let logoAnim = null;
let arrowAnims = [];
const time_ms = 800;
// let counter = 0;
let counter = time_ms-22;
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
const nav = document.querySelector('#nav');
const footer = document.querySelector('footer');
const navPanel = document.querySelector('#navPanel');
const navHeadline = document.querySelector('#navHeadline');
const navModal = document.querySelector('#navModal');
const colorNav = document.querySelector('#colorNav')
const navBtnClr = document.querySelector("#navBtnClr")
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
const qrHeadlines = document.querySelectorAll('#qrContainer > .bodyText');
const links = document.querySelectorAll('a');
const logoSrc = document.querySelector('#logoSrc');




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
    initQuadrants();
    initColorNav();
    initLottieLogo();
    initLottieArrows();
    initLines();
    Particles.init();
    ThreeScene.init();

    navBtnClr.onclick = () => {
      // console.log("btn clicked");   
      navPanel.classList.toggle('showNav')
      navPanel.classList.toggle('hideNav')
      // if(navModal.classList.contains('hideNav')){
        navModal.classList.toggle('showNav')
        navModal.classList.toggle('hideNav')
      // }
    }
    navModal.onclick = () => {   
      // console.log("clickd")
      navPanel.classList.add('hideNav')
      navPanel.classList.remove('showNav')
      navModal.classList.toggle('showNav')
        navModal.classList.toggle('hideNav')
    }
    if(isMobile){
      document.querySelector("#desktopInstructions").classList.add('hideNav');
    }else{
      document.querySelector("#mobileInstructions").classList.add('hideNav');
    }
    // console.log(logoSrc);
    let navLogo = logoSrc.cloneNode(true);
    let footerLogo = logoSrc.cloneNode(true);
    navLogo.setAttribute("id", "navLogo")
    footerLogo.setAttribute("id", "footerLogo")
    nav.appendChild(navLogo);
    footer.appendChild(footerLogo);


   loop();

}
const initColorNav = () => {
  // console.log(palettes);
  
  // console.log(colorNav);
  console.log("Radical Graphics");
  palettes.forEach((e,i)=>{
    console.log(e.colors.map(c => `%c${"   "}`).join(''), ...e.colors.map(c => `background: ${c};`));      
    //
    let pall = document.createElement('div');
    pall.setAttribute("class", 'palette');
    pall.setAttribute("pos", i);
    // pall.style.background = e.colors[0];
    // d.style.width = '20px'
    // d.style.height = '20px'
    e.colors.map(c => {
      let swatch = document.createElement('div');
      swatch.setAttribute("class", "paletteItem");
      swatch.style.background = c;
      pall.append(swatch)
    })
    pall.onclick = (e) => {
      // console.log(e.target.getAttribute("pos"));
      let num = e.target.getAttribute("pos");
      // console.log(quadrants); 
      if(quadrants.activeQuadrant != num){
        quadrants.calculateNewPalette(num)
        quadrants.activeQuadrant = num;
      }           
    }
    colorNav.append(pall);
  })
  
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
  // console.log("initQuadrants");
  quadrants.rowCount = palettes.length;
  quadrants.w = (docWidth/quadrants.rowCount);
  // console.log(quadrants.w);
  //
  
  // quadrants.calculateQuadrant = (tgt) => {
      
  //     console.log("calculating",tgt);
  //       let curQuadrant = Math.floor(tgt.clientX/quadrants.w)
  //       console.log(curQuadrant, tgt.clientX);
  //       if(quadrants.activeQuadrant != curQuadrant){
  //           quadrants.calculateNewPalette(curQuadrant)
  //           quadrants.activeQuadrant = curQuadrant;
  //           // Particles.scale= curQuadrant/10;
  //           // console.log(Particles.scale);
  //           Particles.initPoints()
  //       }
  //   }
    quadrants.calculateNewPalette = (num) => {
      // console.log(num);
      num = Math.max(0, num)
        let colors = palettes[num].colors;
        quadrants.changeAllColors(colors)
      
      }
    quadrants.changeAllColors = (arr) => {
      let items;
        let num = arr.length;
        bg.style.background = arr[0];
       
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
          navHeadline.style.color = arr[0];
          qrHeadlines.forEach((e)=>{
            e.style.color = arr[1]
          })
         links.forEach((e)=>{
            e.style.color = arr[2]
          })
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
          navHeadline.style.color = arr[1];
          qrHeadlines.forEach((e)=>{
            e.style.color = arr[1];
          })
          links.forEach((e)=>{
            e.style.color = arr[1];
          })
          
        }
        let itms = lines.querySelectorAll(".line")
        itms.forEach((itm) => {
          itm.style.fill = arr[arr.length-1];
        })
        nav.style.background=arr[arr.length-1];
        footer.style.background=arr[arr.length-1];
        footer.style.color=arr[0];
        navLogo.style.fill=arr[0];
        footerLogo.style.fill=arr[0];
        explainerTxt.forEach((txt) => {

          // txt.style.background = arr[0];
          txt.style.color = arr[arr.length-1];
        })
        txtContainer.forEach((itm) => {

          itm.style.background = arr[0];
        })
        Particles.clr = arr[1];
        ThreeScene.changeColor(arr[1])
        qr.style.fill = arr[1]
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
    // if(firstTime){
    //   firstTime=false
    //   quadrants.calculateNewPalette(1)
    // }
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
    return;
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
    Particles.resize();
    ThreeScene.resize();
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

// let rand = Math.floor(Math.floor(Math.random()*docWidth)/quadrants.w)
//   // if(quadrants.activeQuadrant != rand){
//       quadrants.calculateNewPalette(rand)
//       quadrants.activeQuadrant = rand;
//   // }
//   loop();