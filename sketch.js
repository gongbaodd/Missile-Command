const DEV = true
const settings = {
  orbitControl: false,
  fontRegular: null,
}

class Entity {
  constructor(id) {
    this.id = id;
    this.components = new Map();
  }
  addComponent(component) {
    this.components.set(component.constructor.name, component);
  }

  getComponent(componentClass) {
    return this.components.get(componentClass.name);
  }

  hasComponent(componentClass) {
    return this.components.has(componentClass.name);
  }
}

class Position {
  constructor(x, y, z) {
    this.x = x
    this.y = y
    this.z = z
  }
}

class Ground {
  constructor(r) {
    this.radius = r
    this.height = 1
  }
}
Ground.update = function (entity) {
  if (entity.hasComponent(Ground)) {
    const position = entity.getComponent(Position)
    const ground = entity.getComponent(Ground)
    const color = entity.getComponent(Color)

    push()
    translate(position.x, position.y, position.z)
    fill(color.r, color.g, color.b)
    cylinder(ground.radius, ground.height, 100)
    pop()
  }
}

class Cursor {
  constructor(radius, space, height) {
    this.radius = radius
    this.space = space
    this.clickHight = height
  }
}
Cursor.mousePos = null
Cursor.pressed = false
Cursor.pressedTime = 0
Cursor.marker = null
Cursor.update = function (entity, sys) {
  if (entity.hasComponent(Cursor)) {
    const ground = sys.entities.find(entity => entity.id === IDs.ground)
    const groundPos = ground.getComponent(Position)
    const groundShape = ground.getComponent(Ground)
    const cursor = entity.getComponent(Cursor)
    const color = entity.getComponent(Color)
    const hoverColor = entity.getComponent(HoverColor)

    for (let x = -groundShape.radius; x < groundShape.radius; x += cursor.space) {
      for (let z = -groundShape.radius; z < groundShape.radius; z += cursor.space) {
        if (x * x + z * z <= groundShape.radius * groundShape.radius) {
          // if in the ground
          const v = createVector(x, groundPos.y, z)
          const { dist } = {
            get dist() {
              if (!Cursor.mousePos) {
                return Infinity
              }
              return v.dist(Cursor.mousePos)
            }
          }

          push()
          translate(v.x, v.y, v.z)

          fill(color.r, color.g, color.b)

          if (dist < cursor.space / 2) {
            fill(hoverColor.r, hoverColor.g, hoverColor.b)

            if (Cursor.pressed) {
              const ch = cursor.clickHight * Cursor.pressedTime
              push()
              translate(0, -ch / 2, 0)
              cylinder(cursor.radius, ch)
              pop()
              Cursor.pressedTime += 1
              Cursor.marker = v.add(createVector(0, -ch, 0))
            }
          }

          sphere(cursor.radius)
          pop()
        }
      }
    }

    if (Cursor.marker) {
      push()
      translate(Cursor.marker.x, Cursor.marker.y, Cursor.marker.z)
      fill(hoverColor.r, hoverColor.g, hoverColor.b)
      sphere(cursor.radius)
      pop()
    }
  }
}

class Color {
  constructor(r, g, b) {
    this.r = r
    this.g = g
    this.b = b
  }
}

class HoverColor extends Color { }
class LaserHeadColor extends Color { }
class LaserBodyColor extends Color { }
class LaserEmitterColor extends Color { }

class Laser {
  constructor(size) {
    this.size = size
  }
}
Laser.update = function (entity, sys) {
  if (entity.hasComponent(Laser)) {
    const ground = sys.entities.find(entity => entity.id === IDs.ground)
    const groundPos = ground.getComponent(Position)
    const position = entity.getComponent(Position)
    const laser = entity.getComponent(Laser)
    const emmiterColor = entity.getComponent(LaserEmitterColor)
    const bodyColor = entity.getComponent(LaserBodyColor)
    const headColor = entity.getComponent(LaserHeadColor)

    push()

    const { rotation } = {
      get rotation() {
        if (!Cursor.marker) {
          return null
        }

        // TODO: the calaculation is wrong the cone only rotates to front
        const rotationCenter = createVector(position.x, groundPos.y - laser.size / 2, position.z)
        const dx = Cursor.marker.x - rotationCenter.x
        const dy = Cursor.marker.y - rotationCenter.y
        const dz = Cursor.marker.z - rotationCenter.z

        const distXZ = sqrt(dx * dx + dz * dz)
        const angleX = atan2(dy, distXZ)
        const angleY = atan2(dx, dz)
        return createVector(angleX, angleY)
      }
    }

    push() // <!--Cone Header
    translate(position.x, groundPos.y, position.z)

    if (rotation) {
      rotateX(rotation.x)
      rotateY(rotation.y)
    }

    fill(emmiterColor.r, emmiterColor.g, emmiterColor.b)
    translate(0, -laser.size, 0)
    cylinder(laser.size / 20, laser.size / 8)


    fill(headColor.r, headColor.g, headColor.b)
    translate(0, laser.size / 3, 0)
    cone(laser.size / 2, laser.size / 2)

    pop() // Cone Header -->

    const axis = createVector(1, 0, 0)
    rotate(PI, axis);

    fill(bodyColor.r, bodyColor.g, bodyColor.b)
    translate(position.x, -groundPos.y + laser.size / 3.6, -position.z)
    cone(laser.size / 3, laser.size / 2)
    pop()

  }
}


const IDs = {
  "ground": 1,
  "cursor": 2,
  "laser": 3,
}

class System {
  constructor(entities) {
    this.entities = entities
  }
  update() {
    addCursorDebugger()
    this.entities.forEach(entity => {
      Ground.update(entity)
      Cursor.update(entity, this)
      Laser.update(entity, this)
    });
  }
}

const gui = new dat.GUI();
let system
let angle = 0;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL)
  noStroke()

  addOrbitControlMenu()

  const entities = []
  const ground = new Entity(IDs.ground)
  ground.addComponent(new Ground(330))
  ground.addComponent(new Position(0, 300, 0))
  ground.addComponent(new Color(150, 200, 250))
  entities.push(ground)
  addGroundMenu(ground)

  const cursor = new Entity(IDs.cursor)
  cursor.addComponent(new Cursor(6, 60, 10))
  cursor.addComponent(new Position(0, 300, 0))
  cursor.addComponent(new Color(0, 0, 255))
  cursor.addComponent(new HoverColor(255, 0, 0))
  entities.push(cursor)
  addCursorMenu(cursor)

  const laser = new Entity(IDs.laser)
  laser.addComponent(new Laser(60))
  laser.addComponent(new Position(100, 300, -300))
  laser.addComponent(new LaserHeadColor(150, 250, 150))
  laser.addComponent(new LaserBodyColor(0, 250, 150))
  laser.addComponent(new LaserEmitterColor(250, 150, 150))
  entities.push(laser)
  addLaserMenu(laser)

  const sys = new System(entities)
  system = sys
}

function draw() {
  if (settings.orbitControl) orbitControl()
  drawScene()
}

function preload() {
  settings.fontRegular = loadFont("./Regular.otf")
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}

function drawScene() {
  background(255)
  system.update()
}

function mouseMoved() {
  if (Cursor.pressed) return;
  if (!system) return;

  // the default fovy is 2 * atan(height / 2 / 800). 800 is the camera's Z position
  const ground = system.entities.find(e => e.getComponent(Ground))
  if (!ground) return;

  const gPos = ground.getComponent(Position)
  const planeY = gPos.y

  let mouseX3D = (mouseX - width / 2) / (width / 2)
  let mouseY3D = (mouseY - height / 2) / (height / 2)

  let fov = PI / 3
  let aspect = width / height
  let nearPlane = tan(fov / 2)

  let rayDir = createVector(
    mouseX3D * nearPlane * aspect,
    mouseY3D * nearPlane,
    -1,
  ).normalize()

  let cameraPos = createVector(0, 0, 800)

  let t = (planeY - cameraPos.y) / rayDir.y

  const mousePos = p5.Vector.add(cameraPos, p5.Vector.mult(rayDir, t))
  Cursor.mousePos = mousePos
}

function mousePressed() {
  Cursor.pressed = true
}

function mouseReleased() {
  Cursor.pressed = false
  Cursor.pressedTime = 0
}

function addOrbitControlMenu() {
  if (DEV) {
    gui.add(settings, "orbitControl").name("Orbit Control")
  }
}

function addGroundMenu(ground) {
  if (DEV) {
    const groundMenu = gui.addFolder("ground");
    groundMenu.add(ground.getComponent(Ground), "radius", 300, 500).name("Radius")
    const colorMenu = groundMenu.addFolder("color")
    colorMenu.add(ground.getComponent(Color), "r", 0, 255).name("R")
    colorMenu.add(ground.getComponent(Color), "g", 0, 255).name("G")
    colorMenu.add(ground.getComponent(Color), "b", 0, 255).name("B")
    const posMenu = groundMenu.addFolder("position")
    posMenu.add(ground.getComponent(Position), "y", 0, 300).name("Y")
  }
}

function addCursorMenu(cursor) {
  if (DEV) {
    const cursorMenu = gui.addFolder("cursor")
    cursorMenu.add(cursor.getComponent(Cursor), "radius", 5, 10).name("Radius")
    cursorMenu.add(cursor.getComponent(Cursor), "space", 10, 50).name("Space")
    const colorMenu = cursorMenu.addFolder("color")
    colorMenu.add(cursor.getComponent(Color), "r", 0, 255).name("R")
    colorMenu.add(cursor.getComponent(Color), "g", 0, 255).name("G")
    colorMenu.add(cursor.getComponent(Color), "b", 0, 255).name("B")
    const hoverMenu = cursorMenu.addFolder("hover color")
    hoverMenu.add(cursor.getComponent(HoverColor), "r", 0, 255).name("R")
    hoverMenu.add(cursor.getComponent(HoverColor), "g", 0, 255).name("G")
    hoverMenu.add(cursor.getComponent(HoverColor), "b", 0, 255).name("B")
  }
}

function addLaserMenu(laser) {
  if (DEV) {
    const laserMenu = gui.addFolder("laser");
    laserMenu.add(laser.getComponent(Laser), "size", 0, 200).name("Size")

    const posMenu = laserMenu.addFolder("position")
    posMenu.add(laser.getComponent(Position), "x", -300, 300).name("X")
    posMenu.add(laser.getComponent(Position), "z", -300, 300).name("Z")

    const emmiterColorMenu = laserMenu.addFolder("emmiter color")
    emmiterColorMenu.add(laser.getComponent(LaserEmitterColor), "r", 0, 255).name("R")
    emmiterColorMenu.add(laser.getComponent(LaserEmitterColor), "g", 0, 255).name("G")
    emmiterColorMenu.add(laser.getComponent(LaserEmitterColor), "b", 0, 255).name("B")

    const bodyColorMenu = laserMenu.addFolder("body color")
    bodyColorMenu.add(laser.getComponent(LaserBodyColor), "r", 0, 255).name("R")
    bodyColorMenu.add(laser.getComponent(LaserBodyColor), "g", 0, 255).name("G")
    bodyColorMenu.add(laser.getComponent(LaserBodyColor), "b", 0, 255).name("B")

    const headColorMenu = laserMenu.addFolder("head color")
    headColorMenu.add(laser.getComponent(LaserHeadColor), "r", 0, 255).name("R")
    headColorMenu.add(laser.getComponent(LaserHeadColor), "g", 0, 255).name("G")
    headColorMenu.add(laser.getComponent(LaserHeadColor), "b", 0, 255).name("B")
  }
}

function addCursorDebugger() {
  if (DEV) {
    if (Cursor.mousePos) {
      push()

      translate(Cursor.mousePos.x, Cursor.mousePos.y, Cursor.mousePos.z)
      fill(0, 255, 0)
      sphere(5)

      pop()
    }
  }
}


function axisHelper(size = 32) {
  if (DEV) {

    push();

    stroke(255, 0, 0);
    strokeWeight(2);
    line(0, 0, 0, size, 0, 0);
    textLabel("X", size + 10, 0, 0);

    stroke(0, 255, 0);
    strokeWeight(2);
    line(0, 0, 0, 0, size, 0);
    textLabel("Y", 0, size + 10, 0);

    stroke(0, 0, 255);
    strokeWeight(2);
    line(0, 0, 0, 0, 0, size);
    textLabel("Z", 0, 0, size + 10);

    pop();
  }
}

function textLabel(txt, x, y, z) {
  push();
  textFont(settings.fontRegular);
  translate(x, y, z);
  fill(0);
  noStroke();
  textSize(16);
  text(txt, 0, 0);
  pop();
}
