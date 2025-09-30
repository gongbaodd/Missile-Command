import type { Component } from 'solid-js';
import { createSignal } from 'solid-js';

const App: Component = () => {
  const [username, setUsername] = createSignal('');

  const handleSubmit = () => {
    if (username().trim()) {
      console.log('Username:', username());

      // @ts-ignore
      window.$username = username()
    }
  };

  return (
    <div class="min-h-screen bg-base-200 flex items-center justify-center">
      <div class="card w-96 bg-base-100 shadow-xl">
        <div class="card-body items-center text-center">
          <h2 class="card-title mb-4">Enter Your Username</h2>
          <div class="form-control w-full max-w-xs">
            <label class="label">
              <span class="label-text">Username</span>
            </label>
            <input
              type="text"
              placeholder="Type your username here"
              class="input input-bordered w-full max-w-xs"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
            />
          </div>
          <div class="card-actions justify-center mt-4">
            <button 
              class="btn btn-primary"
              onClick={handleSubmit}
              disabled={!username().trim()}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;