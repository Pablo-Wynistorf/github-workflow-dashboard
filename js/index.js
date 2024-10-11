const commitsContainer = document.getElementById("commits");
const userListContainer = document.getElementById("userList");
const settingsBtn = document.getElementById("settingsBtn");
const modal = document.getElementById("myModal");
const span = document.getElementsByClassName("close")[0];
const saveBtn = document.getElementById("saveBtn");
const repoUrlInput = document.getElementById("repoUrl");

// Fetch repositories from localStorage
function getReposFromLocalStorage() {
  const repos = localStorage.getItem("github_repos");
  return repos ? JSON.parse(repos) : {};
}

// Save repositories to localStorage
function saveReposToLocalStorage(repos) {
  localStorage.setItem("github_repos", JSON.stringify(repos));
}

// Load users and repositories
function loadUserList() {
  const repos = getReposFromLocalStorage();
  userListContainer.innerHTML = "";

  for (const [user, repoList] of Object.entries(repos)) {
    repoList.forEach(repo => {
      const userItem = document.createElement("div");
      userItem.classList.add("user-item", "bg-gray-700", "p-3", "rounded-md", "flex", "justify-between", "items-center", "mb-2", "shadow-md", "text-gray-100");
      userItem.innerHTML = `${user}/${repo} <span class="remove text-red-500 cursor-pointer" onclick="removeRepo('${user}', '${repo}')">❌</span>`;
      userListContainer.appendChild(userItem);
    });
  }
}

// Remove a user/repo from localStorage
function removeRepo(user, repo) {
  const repos = getReposFromLocalStorage();
  repos[user] = repos[user].filter(r => r !== repo);

  if (repos[user].length === 0) {
    delete repos[user];
  }

  saveReposToLocalStorage(repos);
  loadUserList();
  loadWorkflowRuns();
}

// Open modal
settingsBtn.onclick = function () {
  modal.classList.remove("hidden");
};

// Close modal
span.onclick = function () {
  modal.classList.add("hidden");
};

// Close modal when clicking outside of it
window.onclick = function (event) {
  if (event.target === modal) {
    modal.classList.add("hidden");
  }
};

// Save repo URL to localStorage
saveBtn.onclick = function () {
  const repoUrl = repoUrlInput.value.trim();

  if (repoUrl) {
    const match = repoUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      const username = match[1];
      const repository = match[2];

      const repos = getReposFromLocalStorage();
      repos[username] = repos[username] || [];
      if (!repos[username].includes(repository)) {
        repos[username].push(repository);
        saveReposToLocalStorage(repos);
      } else {
        alert("Repository already exists for this user.");
      }

      repoUrlInput.value = "";
      loadUserList();
      loadWorkflowRuns();
      modal.classList.add("hidden");
    } else {
      alert("Invalid GitHub URL format.");
    }
  }
};

// Fetch latest workflow run for the selected repo
async function fetchLatestWorkflowRun(repoOwner, repoName) {
  const workflowUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs?per_page=1&timestamp=${Date.now()}`; 
  const response = await fetch(workflowUrl, {
    method: 'GET',
  });

  if (!response.ok) {
    console.error("Failed to fetch workflow runs:", response.statusText);
    return null;
  }

  const workflows = await response.json();
  return workflows.workflow_runs.length > 0 ? workflows.workflow_runs[0] : null;
}


// Function to create HTML for a workflow run
function createWorkflowRunElement(workflow, repoOwner, repoName) {
  const workflowElement = document.createElement("div");
  workflowElement.classList.add("commit", "bg-gray-800", "p-4", "rounded-lg", "shadow-lg", "text-gray-100", "mb-4");

  const workflowTitle = document.createElement("h2");
  workflowTitle.classList.add("text-lg", "font-semibold", "mb-2");

  const workflowLink = document.createElement("a");
  workflowLink.href = workflow.html_url;
  workflowLink.target = "_blank";
  workflowLink.innerText = `${repoOwner}/${repoName}`;
  workflowLink.classList.add("text-blue-500", "hover:underline");

  workflowTitle.appendChild(workflowLink);
  workflowElement.appendChild(workflowTitle);

  const commitMessage = document.createElement("h2");
  commitMessage.innerText = "Commit: " + workflow.display_title;
  commitMessage.classList.add("text-gray-300", "mb-2");
  workflowElement.appendChild(commitMessage);

  const workflowStartTime = document.createElement("p");
  workflowStartTime.innerText = "Start Time: " + workflow.run_started_at;
  workflowStartTime.classList.add("text-gray-400", "text-sm");
  workflowElement.appendChild(workflowStartTime);

  const workflowStatus = document.createElement("p");
  workflowStatus.classList.add("status", "text-sm", "font-semibold", "px-3", "py-1", "rounded-full", "mt-3", "inline-block");

  if (workflow.status === "queued") {
    workflowStatus.classList.add("bg-yellow-500", "text-yellow-900");
    workflowStatus.innerText = "Pending";
  } else if (workflow.status === "in_progress") {
    workflowStatus.classList.add("bg-blue-500", "text-blue-900");
    workflowStatus.innerText = "Running";
  } else if (workflow.status === "completed") {
    if (workflow.conclusion === "success") {
      workflowStatus.classList.add("bg-green-500", "text-green-900");
      workflowStatus.innerText = "Success";

    } else {
      workflowStatus.classList.add("bg-red-500", "text-red-900");
      workflowStatus.innerText = "Failed";
    }
  }

  workflowElement.appendChild(workflowStatus);

  return workflowElement;
}


// Load and display the latest workflow run
async function loadWorkflowRuns() {
  commitsContainer.innerHTML = "";
  const repos = getReposFromLocalStorage();

  for (const [repoOwner, repoList] of Object.entries(repos)) {
    for (const repoName of repoList) {
      const workflow = await fetchLatestWorkflowRun(repoOwner, repoName);

      if (workflow) {
        const workflowElement = createWorkflowRunElement(workflow, repoOwner, repoName);
        commitsContainer.appendChild(workflowElement);
      } else {
        const workflowElement = document.createElement("div");
        workflowElement.classList.add("commit", "bg-gray-800", "p-4", "rounded-lg", "shadow-lg", "text-gray-100", "mb-4");
        workflowElement.innerHTML = `<p class="text-gray-400">No recent workflow runs found for ${repoOwner}/${repoName}</p>`;
        commitsContainer.appendChild(workflowElement);
      }
    }
  }
}

loadUserList();
loadWorkflowRuns();

setInterval(loadWorkflowRuns, 5000);
