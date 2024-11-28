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

class Plate {
  constructor(r) {
    this.radius = r
    this.height = 10
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
  "ground": 1
}

class System {
  constructor(entities) {
    this.entities = entities
  }
  update() {
    this.entities.forEach(entity => {
      if (entity.id === IDs.ground) {
        const position = entity.getComponent(Position)
        const plate = entity.getComponent(Plate)
        const color = entity.getComponent(Color)

        push()
        translate(position.x, position.y, position.z)
        fill(color.r, color.g, color.b)
        cylinder(plate.radius, plate.height)
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
  ground.addComponent(new Plate(150))
  ground.addComponent(new Position(0, 300, 0))
  ground.addComponent(new Color(150, 200, 250))

  /* <!-- DEV */
  const groundMenu = gui.addFolder("ground");
  groundMenu.add(ground.getComponent(Plate), "radius", 70, 300).name("Radius").onChange(drawScene)
  const colorMenu = groundMenu.addFolder("color")
  colorMenu.add(ground.getComponent(Color), "r", 0, 255).name("R").onChange(drawScene)
  colorMenu.add(ground.getComponent(Color), "g", 0, 255).name("G").onChange(drawScene)
  colorMenu.add(ground.getComponent(Color), "b", 0, 255).name("B").onChange(drawScene)
  const posMenu = groundMenu.addFolder("position")
  posMenu.add(ground.getComponent(Position), "x", 0, 300).name("X").onChange(drawScene)
  posMenu.add(ground.getComponent(Position), "y", 0, 300).name("Y").onChange(drawScene)
  posMenu.add(ground.getComponent(Position), "z", 0, 300).name("Z").onChange(drawScene)
  /* DEV --> */

  entities.push(ground)

  const sys = new System(entities)

  system = sys
}

function draw() {
  drawScene()
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}

function drawScene() {
  background(255)
  system.update()
}
