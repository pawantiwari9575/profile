const canvas = document.querySelector("#universe");
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "high-performance" });
    const cursor = document.querySelector(".cursor-glow");
    const depthItems = [...document.querySelectorAll("[data-depth]")];
    const navLinks = [...document.querySelectorAll(".nav a")];
    const counter = document.querySelector("[data-counter]");
    const reveals = [...document.querySelectorAll(".reveal")];
    let targetX = 0.5;
    let targetY = 0.48;
    let mouseX = 0.5;
    let mouseY = 0.48;
    let frame = 0;

    const vertexShader = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      mat2 rot(float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c);
      }

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(.11, .17, .13));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float network(vec2 uv, float t) {
        vec2 g = fract(uv * 5.5) - 0.5;
        vec2 id = floor(uv * 5.5);
        float h = hash(vec3(id, 1.0));
        float node = smoothstep(0.055, 0.0, length(g + vec2(sin(t + h * 6.2), cos(t * 0.8 + h * 4.0)) * 0.12));
        float line = smoothstep(0.018, 0.0, min(abs(g.x), abs(g.y))) * 0.11;
        return node + line;
      }

      float tunnel(vec3 p, float t) {
        float d = 8.0;
        for (int i = 0; i < 7; i++) {
          p.xy *= rot(0.38 + float(i) * 0.15 + t * 0.035);
          p = abs(p) / max(dot(p, p), 0.24) - 0.76;
          d = min(d, length(p.xy) + 0.24 * sin(p.z + t));
        }
        return d;
      }

      float stars(vec3 rd, float t) {
        vec3 p = rd * 42.0 + vec3(0.0, 0.0, t * 0.76);
        vec3 id = floor(p);
        vec3 f = fract(p) - 0.5;
        float h = hash(id);
        float d = length(f);
        float star = smoothstep(0.052, 0.0, d) * step(0.963, h);
        return star * (0.62 + 0.38 * sin(t * 8.0 + h * 13.0));
      }

      float rings(vec2 uv, float t) {
        vec2 p = uv;
        p.x *= u_resolution.x / u_resolution.y;
        float a = atan(p.y, p.x);
        float r = length(p);
        float glow = 0.0;
        for (int i = 0; i < 5; i++) {
          float fi = float(i);
          float rr = 0.18 + fi * 0.13 + 0.02 * sin(t * (0.85 + fi * 0.1) + fi);
          float arc = smoothstep(0.4, 0.98, sin(a * (3.0 + fi) + t * (1.1 + fi * 0.2)));
          glow += smoothstep(0.014, 0.0, abs(r - rr)) * arc;
        }
        return glow;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
        vec2 m = (u_mouse - 0.5) * 0.65;
        float t = u_time;
        vec3 ro = vec3(m.x * 0.84, m.y * 0.62, -3.25 + sin(t * 0.22) * 0.46);
        vec3 rd = normalize(vec3(uv + m * 0.22, 1.2));
        rd.xy *= rot(sin(t * 0.15) * 0.16);

        float glow = 0.0;
        for (int i = 0; i < 44; i++) {
          vec3 p = ro + rd * (float(i) * 0.074 + 0.24);
          p.z += t * 0.5;
          float d = tunnel(p, t);
          glow += 0.0024 / (0.08 + d * d * 15.0);
        }

        float ringGlow = rings(uv + m * 0.18, t);
        float starGlow = stars(rd + vec3(uv, 0.0) * 0.03, t) + stars(rd * 1.8 + vec3(2.0, -1.0, 0.5), t * 1.3) * 0.5;
        float mesh = network(uv + m * 0.4 + vec2(t * 0.018, -t * 0.013), t);
        float beam = pow(max(0.0, 1.0 - abs(uv.x + sin(uv.y * 4.0 + t) * 0.05) * 3.2), 5.0);
        float nebula = smoothstep(-0.18, 1.0, sin(uv.x * 7.0 + t) * sin(uv.y * 5.0 - t * 0.8)) * 0.018;

        vec3 cyan = vec3(0.18, 0.44, 0.78);
        vec3 mint = vec3(0.10, 0.58, 0.54);
        vec3 slate = vec3(0.33, 0.40, 0.50);
        vec3 amber = vec3(0.72, 0.42, 0.08);
        vec3 base = vec3(0.010, 0.018, 0.034);
        vec3 palette = mix(cyan, mint, 0.45 + 0.35 * sin(t * 0.34 + uv.x * 2.6));
        palette = mix(palette, slate, 0.28);
        palette = mix(palette, amber, 0.06 * smoothstep(0.58, 1.0, sin(length(uv) * 8.0 - t)));

        vec3 color = base;
        color += glow * palette * 0.32;
        color += ringGlow * mix(cyan, mint, 0.32) * 0.08;
        color += mesh * mix(mint, cyan, 0.55) * 0.13;
        color += beam * cyan * 0.025;
        color += starGlow * vec3(0.55, 0.65, 0.78) * 0.18;
        color += nebula * mix(slate, amber, 0.18);
        color += pow(max(0.0, 1.0 - length(uv - m * 0.22)), 5.0) * vec3(0.012, 0.045, 0.062);

        float vignette = smoothstep(1.2, 0.12, length(uv));
        color *= vignette;
        color = color / (1.0 + color * 1.7);
        color = pow(color, vec3(1.08)) * 0.84;
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    function createProgram() {
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
      }
      return program;
    }

    const program = gl && createProgram();
    const buffer = gl && gl.createBuffer();
    const uniforms = {};

    if (gl) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(program);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      ["u_resolution", "u_time", "u_mouse"].forEach((name) => {
        uniforms[name] = gl.getUniformLocation(program, name);
      });
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(window.innerWidth * dpr);
      const height = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        gl && gl.viewport(0, 0, width, height);
      }
    }

    function render(time) {
      resize();
      mouseX += (targetX - mouseX) * 0.07;
      mouseY += (targetY - mouseY) * 0.07;

      if (gl) {
        gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.u_time, time * 0.001);
        gl.uniform2f(uniforms.u_mouse, mouseX, mouseY);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (frame % 30 === 0) {
          const pixels = new Uint8Array(4 * 9);
          const x = Math.max(0, Math.floor(canvas.width / 2) - 1);
          const y = Math.max(0, Math.floor(canvas.height / 2) - 1);
          gl.readPixels(x, y, 3, 3, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let total = 0;
          let max = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const luminance = pixels[i] + pixels[i + 1] + pixels[i + 2];
            total += luminance;
            max = Math.max(max, luminance);
          }
          document.body.dataset.webgl = "true";
          document.body.dataset.canvasAverage = String(Math.round(total / 9));
          document.body.dataset.canvasMax = String(max);
        }
      }

      frame += 1;
      const px = (mouseX - 0.5) * 2;
      const py = (mouseY - 0.5) * 2;

      depthItems.forEach((item) => {
        const depth = Number(item.dataset.depth || 0.4);
        item.style.transform = `translate3d(${px * depth * 13}px, ${py * depth * 10}px, ${depth * 16}px) rotateX(${-py * depth * 2}deg) rotateY(${px * depth * 2.5}deg)`;
      });

      cursor.style.left = `${mouseX * window.innerWidth}px`;
      cursor.style.top = `${mouseY * window.innerHeight}px`;
      counter.textContent = (4.6 + Math.sin(time * 0.0012) * 0.12).toFixed(1);
      requestAnimationFrame(render);
    }

    function setPointer(x, y) {
      targetX = x / window.innerWidth;
      targetY = y / window.innerHeight;
    }

    window.addEventListener("pointermove", (event) => setPointer(event.clientX, event.clientY), { passive: true });
    window.addEventListener("pointerleave", () => {
      targetX = 0.5;
      targetY = 0.48;
    });
    window.addEventListener("resize", resize);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, { threshold: 0.12 });

    reveals.forEach((item) => observer.observe(item));

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: "-38% 0px -55% 0px", threshold: 0.01 });

    [...document.querySelectorAll("main > section[id]")].forEach((section) => sectionObserver.observe(section));

    resize();
    requestAnimationFrame(render);
