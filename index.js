"use strict";

const fs = require("fs");
const path = require("path");

const Unity = require("UnityBundle.js");
const meshToObj = require("./meshToObj");
const UnityUtils = require("./UnityUtils");

if(!process.argv[2]) {
  console.error(`Usage: ${process.argv[0]} ${process.argv[1]} [.unity3d or .unity3d.lz4]`);
  process.exit(-1);
}

let inFile = process.argv[2];
let unityBundle = Unity.loadFile(inFile);

let bundleName = path.parse(inFile).base.replace(/\.unity3d(?:\.lz4)?$/, "");
for(let i = 0 ; i < unityBundle.length ; i++) {
  let unityAsset = unityBundle[i];

  let prefix = bundleName + "_" + i + "_";

  for(let pathId in unityAsset.data) {
    let object = unityAsset.data[pathId];

    if(object._type === "Mesh") {
      let filename = prefix + object.m_Name + ".obj";
      let obj = meshToObj(object);
      fs.writeFileSync(filename, obj, { encoding: "utf8" });
    }
    else if(object._type === "Texture2D") {
      let filename = prefix + object.m_Name + ".png";
      let img = UnityUtils.textureToJimp(object);
      img.write(filename);
    }
  }
}
