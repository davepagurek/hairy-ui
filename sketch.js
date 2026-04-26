let hairShader
let hairs
let shapes

async function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL)
  setAttributes({ antialias: true })
  hairShader = buildColorShader(drawHairs)
  hairs = buildGeometry(() => {
    rotate(PI/2)
    const verts = []
    for (let i = 0; i <= 30; i++) {
      const progress = i/30
      const pos = createVector(
        (1 - progress) * 5 * sin(i * 0.3),
        map(i, 0, 30, 0, -100)
      )
      verts.push(pos)
    }
    const tangents = verts.slice(1).map((v, i) => v.copy().sub(verts[i]))
    const normals = tangents.map((v) => v.copy().rotate(PI/2).normalize())
    normals.push(normals.at(-1))
    beginShape(QUAD_STRIP)
    for (let i = 0; i <= 30; i++) {
      const progress = i/30
      for (const side of [-1, 1]) {
        const pos = verts[i]
        const n = normals[i]
        const p = pos.copy().add(n.copy().mult(side * (1 - progress) * 2))
        vertex(p.x, p.y)
      }
    }
    endShape(CLOSE)
  })

  const elts = [...document.querySelectorAll('*:not(html, body, svg)')]
    .filter(el => {
      if (el.tagName === 'IFRAME') return true
      const style = window.getComputedStyle(el)
      return style.display !== 'inline' && style.background !== 'none' && style.background !== 'rgb(255, 255, 255)'
    })

  shapes = elts.map((el) => {
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    const tr = style.transform
    let scale = 1
    let angle = 0
    if (tr !== 'none') {
      const values = tr.split('(')[1].split(')')[0].split(',')
      const a = values[0]
      const b = values[1]
      const c = values[2]
      const d = values[3]

      scale = Math.sqrt(a*a + b*b)

      // arc sin, convert from radians to degrees, round
      // const sin = b/scale
      // next line works for 30deg but not 130deg (returns 50)
      // const angle = Math.round(Math.asin(sin) * (180/Math.PI))
      angle = Math.atan2(b, a)
    }
    return {
      center: [(rect.left + rect.right)/2, (rect.top + rect.bottom)/2],
      size: [rect.width * scale, rect.height * scale],
      rotation: angle,
    }
  })
  console.log(elts)
}

function drawHairs() {
  const center = uniformVec2()
  const size = uniformVec2()
  const rotation = uniformFloat()

  worldInputs.begin()
  const progress = fract(noise(instanceID() * PI) * 1000)
  let x = clamp(fract(progress * 2), 0, 0.5) * 2
  let y = (clamp(fract(progress * 2), 0.5, 1) - 0.5) * 2
  if (progress > 0.5) {
    x = 1 - x
    y = 1 - y
  }
  let fromCenter = [x, y] - 0.5
  let n = normalize(fromCenter)
  // let n = normalize([step(abs(fromCenter.x), 0.49), step(abs(fromCenter.y), 0.49)]) *
    // sign(fromCenter)
  let angle = atan(n.y, n.x)
  angle += PI * 0.3 * (fract(noise(instanceID() * PI, 100) * 1000) - 0.5)

  const cosA = cos(angle)
  const sinA = sin(angle)

  const rotated = [
    dot([cosA, -sinA, 0], worldInputs.position),
    dot([sinA, cosA, 0], worldInputs.position),
    worldInputs.position.z
  ]

  const localPositioned = rotated + [x - 0.5, y - 0.5, 0] * [size, 0]

  const cosR = cos(rotation)
  const sinR = sin(rotation)
  let worldPositioned = [
    dot([cosR, -sinR, 0, center.x], [localPositioned, 1]),
    dot([sinR, cosR, 0, center.y], [localPositioned, 1]),
    dot([0, 0, 1, 0], [localPositioned, 1]),
    1
  ]

  const fromMouse = worldPositioned.xyz - [mouseX - width/2, mouseY - height/2, 0]
  const distFromMouse = length(fromMouse)
  const fromBase = worldInputs.position.x / 100
  worldPositioned.xyz += normalize(fromMouse) * 40 * smoothstep(500, 0, distFromMouse) * fromBase

  worldInputs.position = worldPositioned.xyz
  worldInputs.end()

  finalColor.begin()
  finalColor.set([finalColor.color.rgb * mix(0.5, 1, fract(noise(instanceID() * PI, 200) * 1000)), 1])
  finalColor.end()
}

function draw() {
  clear()

  push()
  noStroke()
  fill('#d1a67b')
  shader(hairShader)
  for (const { center, size, rotation } of shapes) {
    const perimeter = (size[0] + size[1]) * 2
    const samples = ceil(perimeter * 2)
    hairShader.setUniform('center', [
      center[0] - width/2,
      center[1] - document.body.parentElement.scrollTop - height/2
    ])
    hairShader.setUniform('size', size)
    hairShader.setUniform('rotation', rotation)
    
    model(hairs, samples)
  }
  pop()
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}
