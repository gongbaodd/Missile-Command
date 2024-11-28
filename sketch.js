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


class System {
  constructor(entities) {
    this.entities = entities
  }
  update() {
    this.entities.forEach(entity => {
    });
  }
}

let system
const IDs = {
  "ground": 1
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL)

  const entities = []
  const floor = new Entity(IDs.ground)

  entities.push(floor)

  const sys = new System(entities)

  system = sys
}

function draw() {
  background(220)

  system.update()
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}