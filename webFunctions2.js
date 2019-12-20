




//takes in the WebGL context, the shader type (either VERTEX_SHADER or FRAGMENT_SHADER), the GLSL source code for the shader
function makeShader(gl, shaderType, shaderSource) {
    var shader = gl.createShader(shaderType);        // Create the shader object
    gl.shaderSource(shader, shaderSource);        // Set the shader source code.
    gl.compileShader(shader);

    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
        // Something went wrong during compilation; get the error
        throw "could not compile shader:" + gl.getShaderInfoLog(shader);
    }
    return shader;
}


//takes in the WebGL context, the vertex shader, and the fragment shader 
function makeProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();

    // attach the shaders.
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    // Check if it linked.
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        // something went wrong with the link
        throw ("program filed to link:" + gl.getProgramInfoLog (program));
    }
    return program;
};

//creates a shader from the content of a script tag
//takes in webgl context, the id of the script tag, the type of shader to create
function makeShaderFromScript(gl, scriptId, opt_shaderType){
    var shaderScript = document.getElementById(scriptId)//look up script tag by id
    if(!shaderScript){
        throw("*** Error: unknown script element " + scriptId)
    }

    var shaderSource = shaderScript.text;//extract contents of the script tag
    //if we didnt pass in a type, use the 'type' from the script tag
    if(!opt_shaderType){
        if(shaderScript.type == "x-shader/x-vertex"){
            opt_shaderType = gl.VERTEX_SHADER;
        }else if(shaderScript.type == "x-shader/x-fragment"){
            opt_shaderType = gl.FRAGMENT_SHADER
        }else if(!opt_shaderType){
            throw("*** Error: shader type not set")
        }
    }

    return makeShader(gl, opt_shaderType,  shaderSource )
}
function createAttributeSetters(gl, program) {
    var attribSetters = {
    };

    function createAttribSetter(index) {
        return function(b) {
            gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
            gl.enableVertexAttribArray(index);
            gl.vertexAttribPointer(index, b.numComponents || b.size, b.type || gl.FLOAT, b.normalize || false, b.stride || 0, b.offset || 0);
        };
    }

    var numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (var ii = 0; ii < numAttribs; ++ii) {
        var attribInfo = gl.getActiveAttrib(program, ii);
        if (!attribInfo) {
            break;
        }
        var index = gl.getAttribLocation(program, attribInfo.name);
        attribSetters[attribInfo.name] = createAttribSetter(index);
    }

    return attribSetters;
  }

  function setAttributes(setters, attribs) {
    setters = setters.attribSetters || setters;
    Object.keys(attribs).forEach(function(name) {
      var setter = setters[name];
      if (setter) {
        setter(attribs[name]);
      }
    });
  }

  //creates setters for each uniform
  function createUniformSetters(gl, program) {
    var textureUnit = 0;
    
    //create a setter for a given uniform
    function createUniformSetter(program, uniformInfo) {
        var location = gl.getUniformLocation(program, uniformInfo.name);
        var type = uniformInfo.type;
        // Check if this uniform is an array
        var isArray = (uniformInfo.size > 1 && uniformInfo.name.substr(-3) === "[0]");
        //FLOAT
            if (type === gl.FLOAT && isArray) {
                return function(v) {gl.uniform1fv(location, v);};
            }
            if (type === gl.FLOAT) {
                return function(v) {gl.uniform1f(location, v);};
            }
            if (type === gl.FLOAT_VEC2) {
                return function(v) {gl.uniform2fv(location, v);};
            }
            if (type === gl.FLOAT_VEC3) {
                return function(v) {gl.uniform3fv(location, v);};
            }
            if (type === gl.FLOAT_VEC4) {
                return function(v) {gl.uniform4fv(location, v);};
            }
        //INT
            if (type === gl.INT && isArray) { return function(v) {gl.uniform1iv(location, v);};
            }
            if (type === gl.INT) { return function(v) { gl.uniform1i(location, v);};
            }
            if (type === gl.INT_VEC2) {return function(v) {gl.uniform2iv(location, v);};
            }
            if (type === gl.INT_VEC3) {return function(v) { gl.uniform3iv(location, v);};
            }
            if (type === gl.INT_VEC4) {return function(v) {gl.uniform4iv(location, v);};
            }
        //BOOL
            if (type === gl.BOOL) {return function(v) {gl.uniform1iv(location, v);};
            }
            if (type === gl.BOOL_VEC2) {return function(v) {gl.uniform2iv(location, v);};
            }
            if (type === gl.BOOL_VEC3) {return function(v) {gl.uniform3iv(location, v);};
            }
            if (type === gl.BOOL_VEC4) {return function(v) {gl.uniform4iv(location, v);};
            }
        //MATRIX
            if (type === gl.FLOAT_MAT2) {return function(v) {gl.uniformMatrix2fv(location, false, v) };
            }
            if (type === gl.FLOAT_MAT3) {return function(v) {gl.uniformMatrix3fv(location, false, v);};
            }
            if (type === gl.FLOAT_MAT4) {return function(v) {gl.uniformMatrix4fv(location, false, v);};
            }
        //SAMPLER
            if ((type === gl.SAMPLER_2D || type === gl.SAMPLER_CUBE) && isArray) {
                var units = [];
                for (var ii = 0; ii < info.size; ++ii) {
                    units.push(textureUnit++);
                }
                return function(bindPoint, units) {
                    return function(textures) {
                        gl.uniform1iv(location, units);
                        textures.forEach(function(texture, index) {
                        gl.activeTexture(gl.TEXTURE0 + units[index]);
                        gl.bindTexture(bindPoint, texture);
                        });
                    };
                }(getBindPointForSamplerType(gl, type), units);
            }
            if (type === gl.SAMPLER_2D || type === gl.SAMPLER_CUBE) {
                return function(bindPoint, unit) {
                    return function(texture) {
                        gl.uniform1i(location, unit);
                        gl.activeTexture(gl.TEXTURE0 + unit);
                        gl.bindTexture(bindPoint, texture);
                    };
                }(getBindPointForSamplerType(gl, type), textureUnit++);
            }
        throw ("unknown type: 0x" + type.toString(16)); // we should never get here.
        }

    var uniformSetters = { };
    var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (var ii = 0; ii < numUniforms; ++ii) {
        var uniformInfo = gl.getActiveUniform(program, ii);
        if (!uniformInfo) {
            break;
        }
        var name = uniformInfo.name;
        // remove the array suffix.
        if (name.substr(-3) === "[0]") {
            name = name.substr(0, name.length - 3);
        }
        var setter = createUniformSetter(program, uniformInfo);
        uniformSetters[name] = setter;
    }
    return uniformSetters;
  }

  function setUniforms(setters, values) {
    setters = setters.uniformSetters || setters;
    Object.keys(values).forEach(function(name) {
      var setter = setters[name];
      if (setter) {
        setter(values[name]);
      }
    });
  }


   /**
   * Returns the corresponding bind point for a given sampler type
   */
  function getBindPointForSamplerType(gl, type) {
    if (type === gl.SAMPLER_2D)   return gl.TEXTURE_2D;        // eslint-disable-line
    if (type === gl.SAMPLER_CUBE) return gl.TEXTURE_CUBE_MAP;  // eslint-disable-line
    return undefined;
  }

function makeAttribute(gl, someShaderProgram, someData, attribName, nc, shouldINormalize){
    //attributes are data pulled from buffers
    //attributes can use float,  vec2,  vec3,  vec4,   mat2,   mat3,  mat4
    var buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)//put data in the buffers

    var attribLocation = gl.getAttribLocation(someShaderProgram,  attribName)  //"a_position"
    gl.enableVertexAttribArray(attribLocation)//allow data to be retreived from a buffer for this attribute

    var numComponents = nc
    var type = gl.FLOAT
    var normalize = shouldINormalize //leave values as the are
    var offset = 0//start at beginning of the buffer
    var stride = 0;//how many bytes to move to the next vertex?  

    gl.vertexAttribPointer(attribLocation, numComponents, type, false, stride)//how to pull data from the bufffers to the attributes 
}

function makeUniform(gl, someShaderProgram, uniformName){
    //values passed to the shader that stays the same for all vertices in a draw call
    var uniformLocation = gl.getUniformLocation(someShaderProgram, "u_offset")//u_offset

    gl.uniform4fv(uniformLocation, [1,0,0,0])

    gl.uniform1f (floatUniformLoc, v);                 // for float
    gl.uniform1fv(floatUniformLoc, [v]);               // for float or float array
    gl.uniform2f (vec2UniformLoc,  v0, v1);            // for vec2
    gl.uniform2fv(vec2UniformLoc,  [v0, v1]);          // for vec2 or vec2 array
    gl.uniform3f (vec3UniformLoc,  v0, v1, v2);        // for vec3
    gl.uniform3fv(vec3UniformLoc,  [v0, v1, v2]);      // for vec3 or vec3 array
    gl.uniform4f (vec4UniformLoc,  v0, v1, v2, v4);    // for vec4
    gl.uniform4fv(vec4UniformLoc,  [v0, v1, v2, v4]);  // for vec4 or vec4 array
    
    //gl.uniformMatrix2fv(mat2UniformLoc, false, [  4x element array ])  // for mat2 or mat2 array
    //gl.uniformMatrix3fv(mat3UniformLoc, false, [  9x element array ])  // for mat3 or mat3 array
    //gl.uniformMatrix4fv(mat4UniformLoc, false, [ 16x element array ])  // for mat4 or mat4 array
    
    gl.uniform1i (intUniformLoc,   v);                 // for int
    gl.uniform1iv(intUniformLoc, [v]);                 // for int or int array
    gl.uniform2i (ivec2UniformLoc, v0, v1);            // for ivec2
    gl.uniform2iv(ivec2UniformLoc, [v0, v1]);          // for ivec2 or ivec2 array
    gl.uniform3i (ivec3UniformLoc, v0, v1, v2);        // for ivec3
    gl.uniform3iv(ivec3UniformLoc, [v0, v1, v2]);      // for ivec3 or ivec3 array
    gl.uniform4i (ivec4UniformLoc, v0, v1, v2, v4);    // for ivec4
    gl.uniform4iv(ivec4UniformLoc, [v0, v1, v2, v4]);  // for ivec4 or ivec4 array
    
    gl.uniform1i (sampler2DUniformLoc,   v);           // for sampler2D (textures)
    gl.uniform1iv(sampler2DUniformLoc, [v]);           // for sampler2D or sampler2D array
    
    gl.uniform1i (samplerCubeUniformLoc,   v);         // for samplerCube (textures)
    gl.uniform1iv(samplerCubeUniformLoc, [v]);         // for samplerCube or samplerCube array


    // in shader
    //uniform vec2 u_someVec2[3];
    
    // in JavaScript at init time
    var someVec2Loc = gl.getUniformLocation(someProgram, "u_someVec2");
      
    // at render time
    gl.uniform2fv(someVec2Loc, [1, 2, 3, 4, 5, 6]);  // set the entire array of u_someVec2
}
