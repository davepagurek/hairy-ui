let hairShader
let hairs

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
    console.log(verts)
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

  const shapes = [
    {
      center: [0, 0],
      size: [200, 100],
      rotation: PI * 0.15,
    }
  ]

  push()
  noStroke()
  fill('#d1a67b')
  shader(hairShader)
  for (const { center, size, rotation } of shapes) {
    const perimeter = (size[0] + size[1]) * 2
    const samples = ceil(perimeter * 2)
    hairShader.setUniform('center', center)
    hairShader.setUniform('size', size)
    hairShader.setUniform('rotation', rotation)
    
    model(hairs, samples)
  }
  pop()
}
