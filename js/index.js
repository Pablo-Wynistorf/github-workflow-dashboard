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
  userListContainer.innerHTML = ""; // Clear existing user list
  for (const [user, repo] of Object.entries(repos)) {
    const userItem = document.createElement("div");
    userItem.classList.add("user-item");
    userItem.innerHTML = `${user}/${repo} <span class="remove" onclick="removeRepo('${user}')">❌</span>`;
    userListContainer.appendChild(userItem);
  }
}

// Remove a user/repo from localStorage
function removeRepo(user) {
  const repos = getReposFromLocalStorage();
  delete repos[user];
  saveReposToLocalStorage(repos);
  loadUserList();
  loadWorkflowRuns(); // Reload workflow runs for the updated repo list
}

// Open modal
settingsBtn.onclick = function () {
  modal.style.display = "block";
};

// Close modal
span.onclick = function () {
  modal.style.display = "none";
};

// Close modal when clicking outside of it
window.onclick = function (event) {
  if (event.target === modal) {
    modal.style.display = "none";
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
      repos[username] = repository; // Add or update repo
      saveReposToLocalStorage(repos);

      repoUrlInput.value = "";
      loadUserList();
      loadWorkflowRuns(); // Reload workflow runs for the new repo
      modal.style.display = "none";
    } else {
      alert("Invalid GitHub URL format.");
    }
  }
};

// Fetch latest workflow run for the selected repo
async function fetchLatestWorkflowRun(repoOwner, repoName) {
  const workflowUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/runs?per_page=1`;
  const response = await fetch(workflowUrl);
  if (!response.ok) {
    console.error("Failed to fetch workflow runs:", response.statusText);
    return null;
  }
  const workflows = await response.json();
  return workflows.workflow_runs.length > 0 ? workflows.workflow_runs[0] : null;
}

// Function to create HTML for a workflow run
function createWorkflowRunElement(workflow) {
  const workflowElement = document.createElement("div");
  workflowElement.classList.add("commit");

  const workflowTitle = document.createElement("h2");
  workflowTitle.innerText = `Workflow: ${workflow.name}`;
  workflowElement.appendChild(workflowTitle);

  const workflowDesc = document.createElement("p");
  workflowDesc.innerText = `Status: ${workflow.status}, Conclusion: ${workflow.conclusion}`;
  workflowElement.appendChild(workflowDesc);

  const workflowStatus = document.createElement("span");
  workflowStatus.classList.add("status");

  if (workflow.conclusion === "success") {
    workflowStatus.classList.add("success");
    workflowStatus.innerText = "Success";
  } else if (workflow.conclusion === "failure") {
    workflowStatus.classList.add("failure");
    workflowStatus.innerText = "Failed";
  } else {
    workflowStatus.innerText = "Pending";
    workflowStatus.classList.add("pending");
  }

  workflowElement.appendChild(workflowStatus);

  return workflowElement;
}

// Load and display the latest workflow run
async function loadWorkflowRuns() {
  commitsContainer.innerHTML = ""; // Clear current workflows
  const repos = getReposFromLocalStorage();

  for (const [repoOwner, repoName] of Object.entries(repos)) {
    const workflow = await fetchLatestWorkflowRun(repoOwner, repoName);

    if (workflow) {
      const workflowElement = createWorkflowRunElement(workflow);
      commitsContainer.appendChild(workflowElement);
    } else {
      const workflowElement = document.createElement("div");
      workflowElement.classList.add("commit");
      workflowElement.innerHTML = `<p>No recent workflow runs found for ${repoOwner}/${repoName}</p>`;
      commitsContainer.appendChild(workflowElement);
    }
  }
}

// Initialize the app by loading user list and workflows
loadUserList();
loadWorkflowRuns();
