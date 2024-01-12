export default {
    build: {

        outDir: "./",
        base: "./"


    },
    server: {
        proxy:{
            target:"https://www.gstatic.com"
        },
        cors: false
    }
}