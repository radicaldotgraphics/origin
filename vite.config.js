export default {
    build: {

        outDir: "./",
        base: "./",

        // outDir is the repo root, which also holds the sources and the
        // pre-built /work directory. Never let a build wipe it.
        emptyOutDir: false

    },
    server: {
        proxy:{
            target:"https://www.gstatic.com"
        },
        cors: false
    }
}