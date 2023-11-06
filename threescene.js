// import * as dat from 'lil-gui'
import * as THREE from 'three'
import Lottie from 'lottie-web'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
//
export  class ThreeScene {

cameraSetup() {
    cameraIsSettled = false;
    cameraTgt = {x:0.11611507465368477,y:3.5939784540499456e-16,z:5.8682635668005005}

}
init(){
        window.addEventListener( 'touchstart', isDown );
        window.addEventListener( 'mousedown', isDown ); 
        window.addEventListener( 'mouseup', isUp );
        window.addEventListener( 'touchend', isUp );
        window.addEventListener( 'mousemove', isMove );
        window.addEventListener( 'touchmove', isMove );
    
}

}

export default ThreeScene