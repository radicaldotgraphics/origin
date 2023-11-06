import Lottie from 'lottie-web'
//
export default class LottieScene {

    anim = null;
    const initLottie = () => {
        anim = Lottie.loadAnimation({
            container: document.getElementById("lottie"),
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path:"data.json"
        });
        let loop = () => {
            
            anim.goToAndPlay(120, true);
        }
        anim.addEventListener("loopComplete", loop)
    }

}
window.initLottie=LottieScene.initLottie
