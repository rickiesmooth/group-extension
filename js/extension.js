(function() {
  class ExampleExtension extends window.Extension {
    constructor() {
      super("group-extension");
      this.addMenuEntry("Groups");
      this.content = "";
      this.things = [];

      fetch(`/extensions/${this.id}/views/content.html`)
        .then(res => res.text())
        .then(text => {
          this.content = text;
        })
        .catch(e => console.error("Failed to fetch content:", e));
    }

    handleSubmit = e => {
      e.preventDefault();
      const checked = Array.from(
        this.devices.getElementsByTagName("input")
      ).filter(input => input.checked);

      window.API.postJson(`/extensions/${this.id}/api/groups`, {
        title: this.name.value,
        devices: checked.map(
          input => this.things.find(thing => thing.id === input.value).id
        )
      })
        .then(body => {
          console.log(body);
          const listItem = document.createElement("li");
          listItem.innerText = body.id;
          this.groupsList.appendChild(listItem);
        })
        .catch(e => {
          this.pre.innerText = e.toString();
        });
    };

    handleDeleteAll = () => {
      window.API.delete(`/extensions/${this.id}/api/groups`);
    };

    showModal = show => {
      show
        ? this.addGroupScreen.classList.remove("hidden")
        : this.addGroupScreen.classList.add("hidden");
    };

    initializeThings = things => {
      this.things = things;
      let html = "";
      for (const thing of things) {
        html += `
            <li>
              <input value=${thing.id} name=${thing.id} type="checkbox">
              <label for=${thing.id}>${thing.title}</label>
            </li>
          `;
      }

      this.devices.insertAdjacentHTML("beforeend", html);
    };

    initializeGroups = groups => {
      let html = "";
      for (const group of groups) {
        html += `
            <li>
              <a href=${group.href}>${group.title}</a>
            </li>
          `;
      }

      this.groupsList.insertAdjacentHTML("beforeend", html);
    };

    show = () => {
      this.view.innerHTML = this.content;
      this.name = document.getElementById("group-extension-form-key");
      this.form = document.getElementById("group-extension-form-content");
      this.pre = document.getElementById("group-extension-response-data");
      this.groupsList = document.getElementById("group-extension-groups");
      this.devices = document.getElementById(
        "group-extension-form-content-devices"
      );
      this.addGroupScreen = document.getElementById("add-group-screen");
      this.deleteButton = document.getElementById("group-extension-delete");
      this.addGroupButton = document.getElementById("add-group-button");
      this.backButton = document.getElementById("add-group-back-button");

      this.form.addEventListener("submit", this.handleSubmit);
      this.deleteButton.addEventListener("click", this.handleDeleteAll);
      this.addGroupButton.addEventListener("click", () => this.showModal(true));
      this.backButton.addEventListener("click", () => this.showModal(false));

      window.API.getJson(`/extensions/${this.id}/api/groups`)
        .then(({ savedGroups, _availableGroupSwitches }) =>
          this.initializeGroups(savedGroups)
        )
        .catch(e => {
          this.groupsList.innerText = e.toString();
        });

      window.API.getThings().then(this.initializeThings);
    };
  }

  new ExampleExtension();
})();
