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
  constructor(r) {
    this.radius = r
  }
}

class Color {
  constructor(r, g, b) {
    this.r = r
    this.g = g
    this.b = b
  }
}

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
      }

      if (entity.getComponent(Cursor)) {
        const ball = entity.getComponent(Cursor)
        const position = entity.getComponent(Position)
        const color = entity.getComponent(Color)

        push()
        translate(position.x, position.y, position.z)
        fill(color.r, color.g, color.b)
        sphere(ball.radius)
        pop()
      }
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



  const groundPos = ground.getComponent(Position)
  const groundShape = ground.getComponent(Ground)
  let count = 0
  for (let x = -groundShape.radius; x < groundShape.radius; x += 33) {
    for (let z = -groundShape.radius; z < groundShape.radius; z += 33) {
      if (x * x + z * z <= groundShape.radius * groundShape.radius) {
        const ball = new Entity(IDs.cursor + "-" + count++)
        ball.addComponent(new Cursor(3))
        ball.addComponent(new Position(x, groundPos.y, z))
        ball.addComponent(new Color(0, 0, 255))
        entities.push(ball)
      }
    }
  }



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

function mousePressed() {
  const cursors = system.entities.findAll(entity => entity.id === IDs.cursor)
  
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
    posMenu.add(ground.getComponent(Position), "x", 0, 300).name("X")
    posMenu.add(ground.getComponent(Position), "y", 0, 300).name("Y")
    posMenu.add(ground.getComponent(Position), "z", 0, 300).name("Z")
  }
}
