import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {FlakesTexture } from 'three/examples/jsm/textures/FlakesTexture';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { PMREMGenerator } from 'three/src/extras/PMREMGenerator';

let ThreeScene =  {
 
    init(){
        
        // console.log("initting");
        this.canvas = document.querySelector('#model');
        this.w = document.documentElement.clientWidth;
        this.h = document.documentElement.clientHeight/2;
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        //
        this.camera = new THREE.PerspectiveCamera(35, this.w / this.h, 0.1, 1000)
        this.camera.position.set(0, 0, 7);
        //
        this.scene = new THREE.Scene()
        this.scene.add(this.camera)
        //
        // this.light1 = new THREE.DirectionalLight( 0xffffff, 2 );
        this.light1 = new THREE.PointLight( 0xffffff, 222, 1000 );
        this.light1.position.set(1,3,1);
        
        
        // this.plightHelper = new THREE.PointLightHelper(this.light1, 11)
        // this.plightHelper.intensity=11;
        // this.scene.add(this.plightHelper)
        
        this.scene.add(this.light1);
       this.canvas.addEventListener('scroll', this.ignoreScroll, false)
    // //   window.addEventListener('resize', this.resize.bind);
        // Controls
        this.controls = new OrbitControls(this.camera, this.canvas)
        this.controls.enableDamping = true;
        // this.controls.minDistance = 4
        // this.controls.maxDistance = 7
        this.controls.maxPolarAngle = Math.PI / 2
        this.controls.maxAzimuthAngle=0.785
        this.controls.minAzimuthAngle=-1.5
        this.controls.noPan = true;
        this.controls.noKeys = true;
        // this.controls.noRotate = true;
        this.controls.enableZoom = false;
        //
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha:true
        })

        //
        this.renderer.setSize(this.w, this.h)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        // this.renderer.outputEncoding = THREE.SRGBColorSpace;
        this.renderer.toneMappingExposure = 1.4;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.dracoLoader = new DRACOLoader()
        this.dracoLoader.setDecoderPath('draco/')
        //
        this.tl = new THREE.TextureLoader();
        this.tx = this.tl.load("./assets/wheel1.png");
        this.tx.flipY = false;
        this.tx.colorSpace = THREE.SRGBColorSpace
        this.mat = new THREE.MeshBasicMaterial({ map: this.tx, transparent:true, side:THREE.DoubleSide})
    
        //
        this.tx2 = this.tl.load("./assets/wheel2.png");
        this.tx2.flipY = false;
        this.tx2.colorSpace = THREE.SRGBColorSpace
        this.mat2 = new THREE.MeshBasicMaterial({ map: this.tx2, transparent:true, side:THREE.DoubleSide})
        //
        this.tx3 = this.tl.load("./assets/wheel3.png");
        this.tx3.flipY = false;
        this.tx3.colorSpace = THREE.SRGBColorSpace
        this.mat3 = new THREE.MeshBasicMaterial({ map: this.tx3, transparent:true, side:THREE.DoubleSide})
        //
        //
        this.txf = new THREE.CanvasTexture(new FlakesTexture());
        this.wrapS = THREE.RepeatWrapping;
        this.wrapT = THREE.RepeatWrapping;
        this.txf.repeat.x = 10;
        this.txf.repeat.y = 6;
        //
        this.bm = {
            clearcoat:1.0,
            clearcoatRoughness:0.1,
            metalness: 0.9,
            roughness:0.5,
            color:0x8418ca,
            normalMap:this.txf,
            normalScale: new THREE.Vector2(0.15, 0.15)
        }
        this.mat4 = new THREE.MeshPhysicalMaterial(this.bm);
        //

        this.gltfLoader = new GLTFLoader()
        // this.gltfLoader.setDRACOLoader(this.dracoLoader)
        this.loadGlTF();
    },
    changeColor(clr){
        // console.log(clr)
        // this.light1.color=clr;
        // this.light1.color=clr;
        let color = new THREE.Color(clr);
        
        this.light1.color.setHex( color.getHex() );
    },
    resize(){
        console.log("this.resize");
        this.init();
    },
    ignoreScroll(e){
        e.preventDefault();
        // console.log();
    },
    loadGlTF(){
        
        this.gltfLoader.load(
            './assets/wheel.glb',
            // './assets/test.glb',
            (gltf) =>{
                gltf.scene.rotation.x=90-1;
                // console.log(this.mat4);
                // gltf.scene.material = this.mat4;
                 gltf.scene.traverse((child) =>{
                    if(child.name == 'Cylinder'){
                        // console.log(this.mat);
                        // child.material = this.mat4;
                    }
                    if(child.name == 'plane1'){
                        // console.log(this.mat);
                        child.material = this.mat;
                        this.wheel1 = child;
                    }if(child.name == 'plane2'){
                        child.material = this.mat2;
                        this.wheel2 = child;
                    }if(child.name == 'plane3'){
                        child.material = this.mat3;
                        this.wheel3 = child;
                    }
                })
                // console.log(this.scene);
                this.scene.add(gltf.scene)
                this.tick();
                this.loadHDR.bind(this);
            }
        )
        // console.log(this.scene);
    },
    loadHDR(){

        this.rgbeLoader = new RGBELoader();
        this.rgbeLoader.setDataType( THREE.HalfFloatType );
        this.pmremGenerator = new PMREMGenerator(this.renderer);
        //
        this.rgbeLoader.load( './assets/clouds.hdr', function ( texture ) {
        
            
            this.envMap = this.pmremGenerator.fromEquirectangular( texture ).texture;
               this.bm.envMap = this.envMap // this.scene.background = texture;
                // this.scene.environment = this.envMap;
				// this.texture.dispose();
				// this.pmremGenerator.dispose();
            
        }, undefined, function ( error ) {
	        console.error( error );
        } );

    },
    tick(){
        this.controls.update()
        // Render
        if(this.wheel1){

            this.wheel1.rotation.y+=.01;
            this.wheel2.rotation.y-=.02;
            this.wheel3.rotation.y+=.02;
        }
        this.renderer.render(this.scene, this.camera)
    //    window.requestAnimationFrame(this.tick.bind(this))
    }
}


  
  

export default ThreeScene;