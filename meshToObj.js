"use strict";

function read2Float(buf, pos) {
  return {
    x: buf.readFloatLE(pos),
    y: buf.readFloatLE(pos + 4),
    toString() { return `${this.x} ${1 - this.y}`; }
  };
}

function read3Float(buf, pos) {
  return {
    x: buf.readFloatLE(pos),
    y: buf.readFloatLE(pos + 4),
    z: buf.readFloatLE(pos + 8),
    toString() { return `${-this.x} ${this.y} ${this.z}`; }
  };
}

function read4Float(buf, pos) {
  return {
    x: buf.readFloatLE(pos),
    y: buf.readFloatLE(pos + 4),
    z: buf.readFloatLE(pos + 8),
    w: buf.readFloatLE(pos + 12),
    toString() { return `${this.x} ${this.y} ${this.z} ${this.w}`; }
  };
}

function read4UInt8(buf, pos) {
  return {
    x: buf.readUInt8(pos),
    y: buf.readUInt8(pos + 1),
    z: buf.readUInt8(pos + 2),
    w: buf.readUInt8(pos + 3),
    toString() { return `${this.x} ${this.y} ${this.z} ${this.w}`; }
  };
}

//==============================================================================

function getMeshData(mesh) {
  let indices = [];
  let triangles = [];
  let vertices = [];
  let normals = [];
  let colors = [];
  let uv1 = [];
  let uv2 = [];
  let uv3 = [];
  let uv4 = [];
  let tangents = [];

  for(let submesh of mesh.m_SubMeshes.Array) {
    let subIndices = [];
    let subTriangles = [];

    let buf = mesh.m_IndexBuffer.Array, pos = submesh.firstByte;

    for(let i = 0 ; i < submesh.indexCount ; i++) {
      subIndices.push(buf.readUInt16LE(pos));
      pos += 2;
    }

    if(submesh.topology !== 0)
      throw `Not supported topology ${submesh.topology}`;

    subTriangles = subTriangles.concat(subIndices);

    indices.push(subIndices);
    triangles.push(subTriangles);
  }

  let channelCountV5 = 8;
  let buf = mesh.m_VertexData.m_DataSize, pos = 0;
  let channels = mesh.m_VertexData.m_Channels.Array;
  let streams = channels.map(c => c.stream);
  let streamCount = streams.filter((v, i, a) => a.indexOf(v) === i).length;
  let channelCount = channels.length;

  for(let s = 0 ; s < streamCount ; s++) {
    for(let i = 0 ; i < mesh.m_VertexData.m_VertexCount ; i++) {
      for(let j = 0 ; j < channelCount ; j++) {
        let ch;
        if(0 < channelCount) {
          ch = channels[j];
          if(ch.format === 1) throw "16 bit floats are not supported";
        }

        if(ch && 0 < ch.dimension && ch.stream === s) {
          if(j === 0) { vertices.push(read3Float(buf, pos)); pos += 12; }
          else if(j === 1) { normals.push(read3Float(buf, pos)); pos += 12; }
          else if(j === 2) { colors.push(read4UInt8(buf, pos)); pos += 4; }
          else if(j === 3) { uv1.push(read2Float(buf, pos)); pos += 8; }
          else if(j === 4) { uv2.push(read2Float(buf, pos)); pos += 8; }
          else if(j === 5) {
            if(channelCount === channelCountV5) {
              uv3.push(read2Float(buf, pos));
              pos += 8;
            }
            else {
              tangents.push(read4Float(buf, pos));
              pos += 16;
            }
          }
          else if(j === 6) { uv3.push(read2Float(buf, pos)); pos += 8; }
          else if(j === 7) { tangents.push(read4Float(buf, pos)); pos += 16; }
        }
      }
    }
  }

  return {
    indices, triangles,
    vertices, normals, colors,
    uv1, uv2, uv3, uv4,
    tangents,
  };
}

//==============================================================================

function meshToObj(mesh) {
  let meshData = getMeshData(mesh);

  let ret = [];
  let verticalsPerFace = 3;

  let normals = meshData.normals;
  let texCoords = meshData.uv1;
  if(!texCoords) texCoords = meshData.uv2;

  for(let v of meshData.vertices)
    ret.push(`v ${v.toString()}\n`);
  for(let v of normals)
    ret.push(`vn ${v.toString()}\n`);
  for(let v of texCoords)
    ret.push(`vt ${v.toString()}\n`);

  ret.push(`g ${mesh.m_Name}\n`);
  ret.push(`s 1\n`);

  let subCount = mesh.m_SubMeshes.Array.length;
  for(let i = 0 ; i < subCount ; i++) {
    if(subCount === 1) ret.push(`usemtl ${mesh.m_Name}\n`);
    else ret.push(`usemtl ${mesh.m_Name}_${i}\n`);

    let faceTri = [];
    for(let t of meshData.triangles[i]) {
      faceTri.push(t);

      if(faceTri.length === verticalsPerFace) {
        let face = "f ";

        for(let i of faceTri.reverse()) {
          face += (i + 1).toString();

          if(texCoords || normals) {
            face += "/";

            if(texCoords) face += (i + 1).toString();
            if(normals) face += "/" + (i + 1).toString();
          }

          face += " ";
        }

        face += "\n";
        ret.push(face);
        faceTri = [];
      }
    }

    ret.push("\n");
  }

  return ret.join("");
}

module.exports = meshToObj;
