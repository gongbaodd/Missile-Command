const DEV = true
const LASER_HEAD_DEV = true

const settings = {
  orbitControl: false,
  fontRegular: null,
}
const gui = new dat.GUI();
let system

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

class Cursor {
  constructor(radius, space, height) {
    this.radius = radius
    this.space = space
    this.clickHight = height
  }
}
Cursor.marker = null
Cursor.markerTime = 0

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

function addCursorDebugger() {
  if (DEV) {
    if (system.mousePos) {
      push()

      translate(system.mousePos.x, system.mousePos.y, system.mousePos.z)
      fill(0, 255, 0)
      sphere(5)

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
class LaserColor extends Color { }

class Laser {
  constructor(size, speed) {
    this.size = size
    this.speed = speed
  }
}
function addLaserMenu(laser, title) {
  if (DEV) {
    const laserMenu = gui.addFolder(title ?? "laser");
    laserMenu.add(laser.getComponent(Laser), "size", 0, 200).name("Size")
    laserMenu.add(laser.getComponent(Laser), "speed", 0, 10).name("Speed")

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

    const laserColorMenu = laserMenu.addFolder("laser color")
    laserColorMenu.add(laser.getComponent(LaserColor), "r", 0, 255).name("R")
    laserColorMenu.add(laser.getComponent(LaserColor), "g", 0, 255).name("G")
    laserColorMenu.add(laser.getComponent(LaserColor), "b", 0, 255).name("B")
  }
}

const IDs = {
  "ground": 1,
  "cursor": 2,
  "laser": 3,
  "shooter": 4,
  "cannon": 5
}

class System {
  constructor(entities) {
    this.entities = entities
    this.markers = [] // {pos, time, done, gun: {id}}
    this.tempMarker = null
    this.mousePos = null
    this.pressed = false
    this.pressedTime = 0
    this.isGunBusy = {
      3: false,
      4: false,
      5: false
    }
  }
  findNearestAvailableGun(markerPos) {
    let distance = Infinity;
    let result = null
    Object.keys(this.isGunBusy).forEach(id => {
      if (this.isGunBusy[id]) return
      const gun = this.entities.find(entity => entity.id == id)
      const {x, y, z} = gun.getComponent(Position)
      const gDistance = p5.Vector.dist(createVector(x, y, z), markerPos)
      distance = min(gDistance, distance)
      if (distance === gDistance) result = gun
    })

    return result
  }
  update() {
    addCursorDebugger()
    this.entities.forEach(entity => {
      this.updateGround(entity)
      this.updateCursor(entity)
      this.updateLaser(entity)
    });
  }
  addMarker(pos) {
    this.markers.push({ pos, time: 0, done: false, gun: null })
  }
  updateLaser(entity) {
    if (entity.hasComponent(Laser)) {
      const ground = this.entities.find(entity => entity.id === IDs.ground)
      const groundPos = ground.getComponent(Position)
      const position = entity.getComponent(Position)
      const laser = entity.getComponent(Laser)
      const emmiterColor = entity.getComponent(LaserEmitterColor)
      const bodyColor = entity.getComponent(LaserBodyColor)
      const headColor = entity.getComponent(LaserHeadColor)
      const color = entity.getComponent(LaserColor)

      const emitterPosition = createVector(position.x, groundPos.y - laser.size, position.z)

      push()
      push() // <!--Cone Header
      translate(emitterPosition.x, emitterPosition.y, emitterPosition.z)
      fill(emmiterColor.r, emmiterColor.g, emmiterColor.b)
      cylinder(laser.size / 20, laser.size / 8)// emitter

      this.markers = this.markers.map(m => {
        if (this.pressed) return m

        const { pos, time, done, gun } = m
        const marker = { pos, time, done, gun }

        if (!gun) {
          const gun = this.findNearestAvailableGun(pos)
          if (gun?.id !== entity.id) {
            return m
          } else {
            this.isGunBusy[entity.id] = true
            marker.gun = gun
          }
        }

        if (marker.gun.id !== entity.id) return m

        const relativeMarker = p5.Vector.sub(pos, emitterPosition)
        const dist = relativeMarker.mag()

        const totalTime = dist / laser.speed
        const t = constrain(time / totalTime, 0, 1)

        const x = lerp(0, relativeMarker.x, t)
        const y = lerp(0, relativeMarker.y, t)
        const z = lerp(0, relativeMarker.z, t)

        push()
        strokeWeight(2)
        stroke(color.r, color.g, color.b)
        line(0, 0, 0, x, y, z)
        pop()

        marker.time = time + 1

        if (t===1) {
          marker.done = true
          this.isGunBusy[entity.id] = false
        }

        return marker
      }).filter(marker => !marker.done)

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
  updateCursor(entity) {
    if (entity.hasComponent(Cursor)) {
      const ground = this.entities.find(entity => entity.id === IDs.ground)
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
                if (!system.mousePos) {
                  return Infinity
                }
                return v.dist(system.mousePos)
              }
            }

            push()
            translate(v.x, v.y, v.z)

            fill(color.r, color.g, color.b)

            if (dist < cursor.space / 2) {
              fill(hoverColor.r, hoverColor.g, hoverColor.b)

              if (system.pressed) {
                const ch = cursor.clickHight * system.pressedTime
                push()
                translate(0, -ch / 2, 0)
                cylinder(cursor.radius, ch)
                pop()
                system.pressedTime += 1
                this.tempMarker = p5.Vector.add(v, createVector(0, -ch, 0))
              }
            }

            sphere(cursor.radius)
            pop()
          }
        }
      }

      this.markers.forEach(({ pos }) => {
        push()
        translate(pos.x, pos.y, pos.z)
        fill(hoverColor.r, hoverColor.g, hoverColor.b)
        sphere(cursor.radius)
        pop()
      })
    }
  }
  updateGround(entity) {
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
}


function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL)
  noStroke()

  addOrbitControlMenu()

  const entities = []
  const ground = new Entity(IDs.ground)
  ground.addComponent(new Ground(330))
  ground.addComponent(new Position(0, 230, 0))
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
  laser.addComponent(new Laser(60, 2))
  laser.addComponent(new Position(300, 300, 20))
  laser.addComponent(new LaserHeadColor(150, 250, 150))
  laser.addComponent(new LaserBodyColor(0, 250, 150))
  laser.addComponent(new LaserEmitterColor(250, 150, 150))
  laser.addComponent(new LaserColor(0, 255, 0))
  entities.push(laser)
  addLaserMenu(laser)

  const shooter = new Entity(IDs.shooter)
  shooter.addComponent(new Laser(60, 2))
  shooter.addComponent(new Position(-180, 300, 239))
  shooter.addComponent(new LaserHeadColor(80, 200, 80))
  shooter.addComponent(new LaserBodyColor(60, 150, 30))
  shooter.addComponent(new LaserEmitterColor(250, 150, 150))
  shooter.addComponent(new LaserColor(0, 55, 255))
  entities.push(shooter)
  addLaserMenu(shooter, "shooter")

  const cannon = new Entity(IDs.cannon)
  cannon.addComponent(new Laser(60, 2))
  cannon.addComponent(new Position(-60, 300, -300))
  cannon.addComponent(new LaserHeadColor(255, 180, 80))
  cannon.addComponent(new LaserBodyColor(255, 80, 80))
  cannon.addComponent(new LaserEmitterColor(250, 150, 150))
  cannon.addComponent(new LaserColor(255, 100, 100))
  entities.push(cannon)
  addLaserMenu(cannon, "cannon")

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
  if (!system) return;
  if (system.pressed) return;

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
  system.mousePos = mousePos
}

function mousePressed() {
  system.pressed = true
}

function mouseReleased() {
  system.pressed = false
  system.pressedTime = 0
  if (system.tempMarker) {
    system.addMarker(system.tempMarker)
    system.tempMarker = null
  }
}

function addOrbitControlMenu() {
  if (DEV) {
    gui.add(settings, "orbitControl").name("Orbit Control")
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
