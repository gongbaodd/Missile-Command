const DEV = true

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

class Cursor {
  constructor(radius, space) {
    this.radius = radius
    this.space = space
  }
}
Cursor.mousePos = null

class Color {
  constructor(r, g, b) {
    this.r = r
    this.g = g
    this.b = b
  }
}

class HoverColor extends Color {}

const IDs = {
  "ground": "ground",
  "cursor": "cursor",
}

class System {
  constructor(entities) {
    this.entities = entities
  }
  update() {
    this.entities.forEach(entity => {
      if (entity.getComponent(Ground)) {
        const position = entity.getComponent(Position)
        const ground = entity.getComponent(Ground)
        const color = entity.getComponent(Color)

        push()
        translate(position.x, position.y, position.z)
        fill(color.r, color.g, color.b)
        cylinder(ground.radius, ground.height)
        pop()
      }// Ground

      if (entity.getComponent(Cursor)) {
        const ground = this.entities.find(entity => entity.id === IDs.ground)
        const groundPos = ground.getComponent(Position)
        const groundShape = ground.getComponent(Ground)
        const cursor = entity.getComponent(Cursor)
        const color = entity.getComponent(Color)
        const hoverColor = entity.getComponent(HoverColor)

        addCursorDebugger()

        for (let x = -groundShape.radius; x < groundShape.radius; x += cursor.space) {
          for (let z = -groundShape.radius; z < groundShape.radius; z += cursor.space) {
            if (x * x + z * z <= groundShape.radius * groundShape.radius) {
              // if in the ground
              const v = createVector(x, groundPos.y, z)
              const { dist } =  {
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

              if (dist < cursor.radius) {
                fill(hoverColor.r, hoverColor.g, hoverColor.b)
              }

              sphere(cursor.radius)
              pop()
            }
          }
        }
      } // Cursor


    });
  }
}

const gui = new dat.GUI();
let system
let angle = 0;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL)
  noStroke()

  const entities = []
  const ground = new Entity(IDs.ground)
  ground.addComponent(new Ground(300))
  ground.addComponent(new Position(0, 300, 0))
  ground.addComponent(new Color(150, 200, 250))
  entities.push(ground)
  addGroundMenu(ground)

  const cursor = new Entity(IDs.cursor)
  cursor.addComponent(new Cursor(6, 40))
  cursor.addComponent(new Position(0, 300, 0))
  cursor.addComponent(new Color(0, 0, 255))
  cursor.addComponent(new HoverColor(255, 0, 0))
  entities.push(cursor)
  addCursorMenu(cursor)

  const sys = new System(entities)
  system = sys
}

function draw() {
  if (DEV) {
    // orbitControl()
  }
  drawScene()

}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}

function drawScene() {
  background(255)
  system.update()
}

function mouseMoved() {
  // the default fovy is 2 * atan(height / 2 / 800). 800 is the camera's Z position
  const ground = system.entities.find(e => e.getComponent(Ground))
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
