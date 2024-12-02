const DEV = true
const LASER_HEAD_DEV = true

const COLORS = [
  '#FF57337F', // Bright Red-Orange
  '#33FF577F', // Bright Green
  '#5733FF7F', // Vibrant Blue-Purple
  '#FFD7007F', // Gold
  '#FF69B47F', // Hot Pink
  '#00CED17F', // Dark Turquoise
  '#FFA5007F', // Orange
  '#8A2BE27F', // Blue Violet
  '#228B227F', // Forest Green
  '#FF45007F'  // Orange Red
]


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

class Houses {
  constructor(num, minH, maxH, minW, maxW) {
    this.radius = 330
    this.num = num
    const createHouse = () => {
      const width = random(minW, maxW)
      const height = random(minH, maxH)
      const size = createVector(width, height, width)
      const color = random(COLORS)

      return { size, pos: null, color}
    }

    const houses = Array.from(new Array(num))
      .map(createHouse)
      .concat({ // test building
        size: createVector(100, 200, 100),
        pos: createVector(0, 0),
        color: COLORS[0]
      })

    this.houses = houses.map(h => {
      if (h.pos) return h

      const position = this.placeHouse(h.size, houses)
      if (position) {
        h.pos = position
      } else {
        console.warn("Failed to place a house:", h)
      }

      return h
    }).filter(h => !!h.pos)

  }

  isValidPlacement(pos, size, houses) {
    // Check if the house is fully inside the circle
    let corners = [
      createVector(pos.x - size.x / 2, pos.y - size.y / 2),
      createVector(pos.x + size.x / 2, pos.y - size.y / 2),
      createVector(pos.x - size.x / 2, pos.y + size.y / 2),
      createVector(pos.x + size.x / 2, pos.y + size.y / 2),
    ]

    for (let corner of corners) {
      if (dist(corner.x, corner.y, 0, 0) > this.radius) {
        return false // Corner is outside the circle
      }
    }

    // Check for overlap with other houses
    for (let house of houses) {
      if (house.pos) {
        let otherCorners = [
          createVector(
            house.pos.x - house.size.x / 2,
            house.pos.y - house.size.y / 2
          ),
          createVector(
            house.pos.x + house.size.x / 2,
            house.pos.y - house.size.y / 2
          ),
          createVector(
            house.pos.x - house.size.x / 2,
            house.pos.y + house.size.y / 2
          ),
          createVector(
            house.pos.x + house.size.x / 2,
            house.pos.y + house.size.y / 2
          ),
        ]
        for (let c1 of corners) {
          for (let c2 of otherCorners) {
            if (abs(c1.x - c2.x) < size.x && abs(c1.y - c2.y) < size.y) {
              return false // Corners overlap
            }
          }
        }
      }
    }

    return true
  }

  placeHouse(size, houses) {
    let maxAttempts = 1000
    while (maxAttempts > 0) {
      let angle = random(TWO_PI)
      let distance = random(0, this.radius - max(size.x, size.y) / 2)
      let x = cos(angle) * distance
      let y = sin(angle) * distance
      let position = createVector(x, y)

      if (this.isValidPlacement(position, size, houses)) {
        return position // Return the valid position
      }

      maxAttempts--
    }

    return null // Failed to place the house after many attempts
  }
}

function addHousesMenu(houses) {
  if (DEV) {
    const housesMenu = gui.addFolder("houses")
    const hComponent = houses.getComponent(Houses)

    let i = 1
    for (const hs of hComponent.houses) {
      const menu = housesMenu.addFolder("house - " + i)
      
      const sizeMenu = menu.addFolder("size")
      sizeMenu.add(hs.size, "x", 10, 100).name("X Width")
      sizeMenu.add(hs.size, "y", 50, 200).name("Y Height")
      sizeMenu.add(hs.size, "z", 10, 100).name("Z Width")

      const posMenu = menu.addFolder("position")
      posMenu.add(hs.pos, "x", -300, 300).name("X")
      posMenu.add(hs.pos, "y", -300, 300).name("Y")
      posMenu.add(hs.pos, "z", -300, 300).name("Z")

      menu.addColor({color: hs.color.slice(0, 7)}, "color").name("color").onChange((newColor) => {
        hs.color = newColor + hs.color.slice(7)
      });

      i++
    }
  }
}

class Missiles {
  constructor(size, radius=500, height=-800, interval=2000, speed=0.001) {
    this.size = size
    this.height = height
    this.radius = radius
    this.missiles = []
    this.interval = interval
    this.speed = speed

    let timeout
    const missileInterval = () => {
      this.missiles.push(this.createMissile())
      timeout && clearTimeout(timeout)
      timeout = setTimeout(missileInterval, interval)
    }

    missileInterval()
  }
  isHitingBuilding(missile, house) {
    const { size, pos } = house
    const { position } = missile
    const r = this.size

    const closestX = constrain(position.x, pos.x - size.x/2, pos.x + size.x/2)
    const closestY = constrain(position.y, pos.y, pos.y + size.y/2)
    const closestZ = constrain(position.z, pos.z - size.x/2, pos.z + size.x/2)

    const distX = position.x - closestX
    const distY = position.y - closestY
    const distZ = position.z - closestZ

    return distX*distX + distY*distY + distZ*distZ <= r*r
  }
  createMissile() {
    const color = random(COLORS)
    const position = createVector(
      random(-this.radius, this.radius),
      this.height,
      random(-this.radius, this.radius)
    )
    return {
      color,
      position,
      target: null,
      startFrame: 0,
      active: true
    }
  }
  setTarget(missile, vec) {
    missile.target = vec
  }
  setFrameCount(missile, count) {
    missile.startFrame = count
  }
  destroy(missile) {
    missile.active = false
  }
}
function addMissileMenu(missiles) {
  if(!DEV) return

  const menu = gui.addFolder("missiles")
  const ms = missiles.getComponent(Missiles)
  menu.add(ms, "size", 3, 50).name("size")
  menu.add(ms, "radius", 300, 800).name("radius")
  menu.add(ms, "height", -300, -800).name("height")
  menu.add(ms, "interval", 500, 5000).name("interval")
  menu.add(ms, "speed", 0.0001, 0.01).name("speed")
}

const IDs = {
  "ground": 1,
  "cursor": 2,
  "laser": 3,
  "shooter": 4,
  "cannon": 5,
  "houses": 6,
  "missiles": 7
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
      const { x, y, z } = gun.getComponent(Position)
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
      this.updateHouses(entity)
      this.updateMissiles(entity)
    });
  }
  addMarker(pos) {
    this.markers.push({ pos, time: 0, done: false, gun: null })
  }
  updateLaser(entity) {
    if (!entity.hasComponent(Laser)) return
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

      if (t === 1) {
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
  updateCursor(entity) {
    if (!entity.hasComponent(Cursor)) return
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
    if (!entity.hasComponent(Ground)) return
    const position = entity.getComponent(Position)
    const ground = entity.getComponent(Ground)
    const color = entity.getComponent(Color)

    push()
    translate(position.x, position.y, position.z)
    fill(color.r, color.g, color.b)
    cylinder(ground.radius, ground.height, 100)
    pop()
  }
  updateHouses(entity) {
    if (!entity.hasComponent(Houses)) return

    const hComponent = entity.getComponent(Houses)
    const ground = this.entities.find(e => e.id === IDs.ground)
    const groundPos = ground.getComponent(Position)
    const groundRadius = ground.getComponent(Ground).radius
    const delta = hComponent.radius / groundRadius

    hComponent.houses.forEach(house => {
      const { size, pos, color } = house
      push()
      stroke(0, 0, 0)
      strokeWeight(2)
      fill(color)
      translate(pos.x * delta, groundPos.y - size.y/2, pos.y * delta)
      box(size.x, size.y, size.z)
      pop()
    })
  }
  updateMissiles(entity) {
    if (!entity.hasComponent(Missiles)) return

    const mComponent = entity.getComponent(Missiles)
    const gEntity = this.entities.find(e => e.id === IDs.ground)
    const hEntity = this.entities.find(e => e.id === IDs.houses)
    const hComponent = hEntity.getComponent(Houses)
    const gPos = gEntity.getComponent(Position)
    const ground = gEntity.getComponent(Ground)

    mComponent.missiles.forEach(m => {
      if (!m.target) {
        const target = createVector(
          random(-ground.radius, ground.radius),
          gPos.y,
          random(-ground.radius, ground.radius),
        )
        mComponent.setTarget(m, target)
        mComponent.setFrameCount(m, frameCount)
      }
      const direction = p5.Vector.sub(m.target, m.position)

      const t = min((frameCount-m.startFrame)*mComponent.speed, 1)
      const x = lerp(0, direction.x, t)
      const y = lerp(0, direction.y, t)
      const z = lerp(0, direction.z, t)

      hComponent.houses.forEach(house => {
        if(mComponent.isHitingBuilding(m, house)) {
          console.log("hit")
        }
      })

      push()
      fill(m.color)
      translate(m.position.x, m.position.y, m.position.z)
      translate(x, y, z)
      sphere(mComponent.size)
      pop()

      if (t === 1) {
        mComponent.destroy(m)
      }
    })

    mComponent.missiles = mComponent.missiles.filter(m => m.active)
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

  const houses = new Entity(IDs.houses)
  houses.addComponent(new Houses(10, 50, 200, 10, 100))
  entities.push(houses)
  addHousesMenu(houses)

  const missiles = new Entity(IDs)
  missiles.addComponent(new Missiles(15, 500, -500, 1000))
  entities.push(missiles)
  addMissileMenu(missiles)

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
