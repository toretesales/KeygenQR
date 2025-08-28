// Wait until DOM is fully ready
document.addEventListener("DOMContentLoaded", () => {
    // === Manual QR Form Elements ===
    const accNameInput = document.getElementById("accNameInput");
    const issuerNameInput = document.getElementById("issuerNameInput");
    const secretKeyInput = document.getElementById("secretKeyInput");
    const genBtn = document.getElementById("genManualQR");

    // === Import Elements ===
    const fileInput = document.getElementById("fileInput");
    const importBtn = document.getElementById("btnImportFile");
    const createEntryBtn = document.getElementById("btnCreateEntry");
    const authListContainer = document.querySelector(".auth-list-container");
    const countLabel = document.querySelector("#authListFromImport p");

    // === Containers to toggle ===
    const formEnterManually = document.getElementById("formEnterManually");
    const authListFromImport = document.getElementById("authListFromImport");

    // === Modals & Close Buttons ===
    const qrModal = document.getElementById("qrModal");
    const qrBox = qrModal.querySelector(".modal");
    const qrContainer = document.getElementById("qrcode");
    const closeQRBtn = document.getElementById("closeQRModal");

    const secretModal = document.getElementById("secretModal");
    const secretBox = secretModal.querySelector(".modal");
    const secretKeyDisplay = document.getElementById("secretKeyDisplay");
    const closeSecretBtn = document.getElementById("closeSecretModal");

    // === Hide both containers by default ===
    formEnterManually.style.display = "none";
    authListFromImport.style.display = "none";

    // === Helpers for OTP URIs ===
    function buildOtpAuthUri(accountName, issuer, secret) {
        const encodedIssuer = encodeURIComponent(issuer);
        const encodedAccName = encodeURIComponent(accountName);
        return `otpauth://totp/${encodedIssuer}:${encodedAccName}?secret=${secret}&issuer=${encodedIssuer}`;
    }

    // === Modal Helpers ===
    function showModal(scrim, box) {
        scrim.classList.remove("hidden");
        box.classList.remove("hidden");
    }
    function hideModal(scrim, box) {
        scrim.classList.add("hidden");
        box.classList.add("hidden");
    }

    // === Manual QR Creation ===
    genBtn.addEventListener("click", () => {
        const accountName = accNameInput.value.trim();
        const issuer = issuerNameInput.value.trim();
        const secret = secretKeyInput.value.trim();

        if (!accountName || !issuer || !secret) {
            alert("Please fill in all fields.");
            return;
        }

        const otpUri = buildOtpAuthUri(accountName, issuer, secret);

        // Clear any existing QR codes
        qrContainer.innerHTML = "";

        // Generate QR code
        new QRCode(qrContainer, {
            text: otpUri,
            width: 256,
            height: 256,
        });

        showModal(qrModal, qrBox);
    });

    // === Close Modal Events ===
    closeQRBtn.addEventListener("click", () => hideModal(qrModal, qrBox));
    closeSecretBtn.addEventListener("click", () => hideModal(secretModal, secretBox));

    qrModal.addEventListener("click", (e) => { if (e.target === qrModal) hideModal(qrModal, qrBox); });
    secretModal.addEventListener("click", (e) => { if (e.target === secretModal) hideModal(secretModal, secretBox); });

    // === Show Manual Entry Form ===
    createEntryBtn.addEventListener("click", () => {
        formEnterManually.style.display = "block";
        authListFromImport.style.display = "none";
    });

    // === Import Handling ===
    importBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.split(/\r?\n/);
            let entries = [];

            lines.forEach(line => {
                if (line.startsWith("otpauth://")) {
                    const entry = parseOtpUri(line);
                    if (entry) entries.push(entry);
                }
            });

            // Clear list
            authListContainer.innerHTML = "";

            // Render entries
            entries.forEach(entry => {
                const div = document.createElement("div");
                div.classList.add("auth-list-item");
                div.innerHTML = `
                    <h3>${entry.accountName}</h3>
                    <p>${entry.issuer}</p>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-create-qr" 
                                data-secret="${entry.secret}" 
                                data-account="${entry.accountName}" 
                                data-issuer="${entry.issuer}">
                            Create QR
                        </button>
                        <button class="strawberry btn-show-secret" data-secret="${entry.secret}">
                            Secret Key
                        </button>
                        <button class="btn-remove">Remove</button>
                    </div>
                `;
                authListContainer.appendChild(div);
            });

            // Update count
            countLabel.textContent = `${entries.length} item${entries.length !== 1 ? "s" : ""}`;

            // Show the import container, hide manual entry
            authListFromImport.style.display = "block";
            formEnterManually.style.display = "none";
        };

        reader.readAsText(file);
    });

    // === Event Delegation for Imported Items ===
    authListContainer.addEventListener("click", (e) => {
        const target = e.target;

        // Show QR
        if (target.classList.contains("btn-create-qr")) {
            const account = target.dataset.account;
            const issuer = target.dataset.issuer;
            const secret = target.dataset.secret;

            const otpUri = buildOtpAuthUri(account, issuer, secret);

            qrContainer.innerHTML = "";
            new QRCode(qrContainer, {
                text: otpUri,
                width: 256,
                height: 256,
            });

            showModal(qrModal, qrBox);
        }

        // Show Secret
        if (target.classList.contains("btn-show-secret")) {
            secretKeyDisplay.textContent = target.dataset.secret;
            showModal(secretModal, secretBox);
        }

        // Remove entry
        if (target.classList.contains("btn-remove")) {
            target.closest(".auth-list-item").remove();

            const newCount = authListContainer.querySelectorAll(".auth-list-item").length;
            countLabel.textContent = `${newCount} item${newCount !== 1 ? "s" : ""}`;
        }
    });

    // === Parse otpauth:// URIs ===
    function parseOtpUri(uri) {
        try {
            const url = new URL(uri);
            const label = decodeURIComponent(url.pathname.slice(1));
            const [issuerFromLabel, accountName] = label.split(":");

            const issuer = url.searchParams.get("issuer") || issuerFromLabel || "Unknown";
            const secret = url.searchParams.get("secret") || "";

            return { accountName, issuer, secret };
        } catch (err) {
            console.error("Invalid OTP URI:", uri);
            return null;
        }
    }
});
