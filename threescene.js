import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
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
        this.camera.position.set(0, 0, 8);
        //
        this.scene = new THREE.Scene()
        this.scene.add(this.camera)
        //
        // this.light1 = new THREE.DirectionalLight( 0xffffff, 2 );
        this.light1 = new THREE.PointLight( 0xffffff, 31, 1000 );
        this.light1.position.set(1,2,2);
        
        
        // this.plightHelper = new THREE.PointLightHelper(this.light1, 11)
        // this.plightHelper.intensity=11;
        // this.scene.add(this.plightHelper)
        
        this.scene.add(this.light1);
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
        this.controls.enableZoom = false;
        //
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha:true
        })
        this.mat = new THREE.MeshStandardMaterial();
        this.mat.metalness=1.0;
        this.mat.roughness=1.0;
        this.mat.color = '0xffffff';
        //
        this.renderer.setSize(this.w, this.h)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.gltfLoader = new GLTFLoader()
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
            './assets/test.glb',
            (gltf) =>{
                // console.log(gltf.scene);
                 gltf.scene.traverse((child) =>{
                    // console.log(child.name);  
                    if(child.name == 'Sphere'){
                    //    child.material = this.mat;
                    }
                })
                // console.log(this.scene);
                this.scene.add(gltf.scene)
                this.tick();
                // this.loadHDR.bind(this);
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
        
            
            this.renderer.toneMappingExposure = 3.36;
            this.envMap = this.pmremGenerator.fromEquirectangular( texture ).texture;
                this.scene.background = texture;
                this.scene.environment = this.envMap;
				this.texture.dispose();
				this.pmremGenerator.dispose();
            
        }, undefined, function ( error ) {
	        console.error( error );
        } );

    },
    tick(){
        this.controls.update()
        // Render
        this.renderer.render(this.scene, this.camera)
    //    window.requestAnimationFrame(this.tick.bind(this))
    }
}


  
  

export default ThreeScene;