import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {FlakesTexture } from 'three/examples/jsm/textures/FlakesTexture';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
// import { DRACOLoader } from 'https://www.gstatic.com/draco/versioned/decoders/1.4.3/'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { PMREMGenerator } from 'three/src/extras/PMREMGenerator';

let ThreeScene =  {
 
    init(){
        this.wheel = null;
        this.spinBtn = null;
        this.bm = null;
        // console.log("initting");
        this.canvas = document.querySelector('#model');
        this.w = window.innerWidth;
        this.h = window.innerHeight/2;
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        //
        this.camera = new THREE.PerspectiveCamera(35, this.w / this.h, 0.1, 1000)
        this.camera.position.set(0, 0, 4);
        //
        this.scene = new THREE.Scene()
        this.scene.add(this.camera)
        //
        // this.light1 = new THREE.DirectionalLight( 0xffffff, 2 );
        this.light1 = new THREE.PointLight( 0xffffff,222 );
        this.light1.position.set(1,3,1);
        this.light2 = new THREE.PointLight( 0xffffff, 222);
        this.light2.position.set(-1,-2,0);
        
        
        // this.plightHelper = new THREE.PointLightHelper(this.light1, 11)
        // this.plightHelper2 = new THREE.PointLightHelper(this.light2, 11)
        
        // this.scene.add(this.plightHelper)
        // this.scene.add(this.plightHelper2)
        
        // this.scene.add(this.light1);
        // this.scene.add(this.light2);
       this.canvas.addEventListener('scroll', this.ignoreScroll, false)
    // //   window.addEventListener('resize', this.resize.bind);
        // Controls
        this.controls = new OrbitControls(this.camera, this.canvas)
        this.controls.enableDamping = true;
        this.controls.minDistance = 4
        this.controls.maxDistance = 7
        this.controls.maxPolarAngle = Math.PI / 2
        this.controls.maxAzimuthAngle=0.785
        this.controls.minAzimuthAngle=-1.5
        this.controls.noPan = true;
        this.controls.noKeys = true;
        this.controls.noRotate = true;
        // this.controls.autoRotate=true;
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
        
        this.renderer.toneMappingExposure = 1.4;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        
        this.spinNrmlMat = new THREE.CanvasTexture(new FlakesTexture());
        this.spinNrmlMat.wrapS = THREE.RepeatWrapping;
        this.spinNrmlMat.wrapT = THREE.RepeatWrapping;
        this.spinNrmlMat.repeat.x = 10;
        this.spinNrmlMat.repeat.y = 6;
        // //
        this.bm = {
            color:0x8418ca,
            roughness: 0.3,
            metalness: .51,
            reflectivity: .61,
            clearcoat: .81,
            clearcoatRoughness: .91,
            transmission:0.01,
            normalMap:this.spinNrmlMat,
            normalScale: new THREE.Vector2(0.1, 0.1),
            side: THREE.DoubleSide
        }
        this.test = {
            color:0x006aff
        }
        this.testMat = new THREE.MeshStandardMaterial(this.test);
        // this.mat4 = new THREE.MeshPhysicalMaterial();
        // this.mat4 = new THREE.MeshStandardMaterial(this.bm);
        // this.mat4 = new THREE.MeshStandardMaterial(this.bm);
        this.mat4 = new THREE.MeshPhysicalMaterial(this.bm);
        // //

        this.gltfLoader = new GLTFLoader()
        // this.gltfLoader.setDRACOLoader(this.dracoLoader)
        this.loadGlTF();
    },
    changeColor(clr){
        // console.log(clr)
        // this.light1.color=clr;
        let color = new THREE.Color(clr);
        
        this.light1.color.setHex( color.getHex() );
        this.light2.color.setHex( color.getHex() );
    },
    resize(){
       
        return;
        // this.w = window.innerWidth;
        // this.h = window.innerHeight/2;
        // this.canvas.width=this.w;
        // this.canvas.height=this.h;
        // this.camera.updateProjectionMatrix();
        // this.renderer.setSize(this.w, this.h);
        // this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // this.init();
    },
    ignoreScroll(e){
        e.preventDefault();
        // console.log();
    },
    loadGlTF(){
        
        this.gltfLoader.load(
            './assets/wheel.glb',
            // 'assets/test.glb',
            (gltf) =>{
                console.log("loaded");
                // gltf.scene.rotation.x=90-1;
                // console.log(this.mat4);
                // gltf.scene.material = this.mat4;
                 gltf.scene.traverse((child) =>{
                    // console.log(child.name);
                    if(child.name == 'wheel'){
                        this.wheel = child;
                    }
                    if(child.name == 'spin_button'){
                        // console.log(this.mat4);
                        child.material = this.mat4;
                        this.spinBtn = child;
                    }
                    if(child.name == 'btncube-false'){
                        // console.log(this.testMat);
                        child.material = this.testMat;
                        
                    }
              
                })
                // console.log(this.scene);
                this.scene.add(gltf.scene)
                this.tick();
                // this.loadHDR.bind(this);
                this.loadHDR(this);
            }
            )
            // console.log(this.scene);
        },
        loadHDR(t){
       

        this.rgbeLoader = new RGBELoader();
        this.rgbeLoader.setDataType( THREE.HalfFloatType );
        t.pmremGenerator = new PMREMGenerator(this.renderer);
        //
        this.rgbeLoader.load( './assets/clouds.hdr', function ( texture ) {
            t.scene.environment = t.pmremGenerator.fromEquirectangular( texture ).texture;
            t.scene.background = t.pmremGenerator.fromEquirectangular( texture ).texture;
            t.bm.envMap=t.pmremGenerator.fromEquirectangular( texture ).texture;
           	texture.dispose();
            t.pmremGenerator.dispose();
            
        }, undefined, function ( error ) {
	        console.error( error );
        } );

    },
    tick(){
        this.controls.update()
        // Render
        if(this.wheel){

            this.wheel.rotation.z+=.1;
        }
        this.renderer.render(this.scene, this.camera)
    //    window.requestAnimationFrame(this.tick.bind(this))
    }
}


  
  

export default ThreeScene;