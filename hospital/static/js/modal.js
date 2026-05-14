/* 显示增加医院模态窗 */
var addModal = document.getElementById("addHospitalModal");
var addCloseBtn = document.querySelector(".add-close");

function openAddHospitalModal() {
    addModal.style.display = "block";
}

/* 关闭增加医院模态窗 */
addCloseBtn.onclick = function() {
    addModal.style.display = "none";
}

document.getElementById("addHospitalForm").addEventListener("submit", function(event) {
    event.preventDefault();
    var formData = {
        hospitalName: document.getElementById("addHospitalName").value,
        hospitalArea: document.getElementById("addHospitalArea").value,
        hospitalType: document.getElementById("addHospitalType").value,
        hospitalLng: document.getElementById("addHospitalLng").value,
        hospitalLat: document.getElementById("addHospitalLat").value
    };
    var addHospitalUrl = document.getElementById("addHospitalUrl").value;

    fetch(addHospitalUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")  // CSRF token
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json().then(data => ({ok: response.ok, data: data})))
    .then(result => {
        var data = result.data;
        if (result.ok && (data.success || data.status === 'success')) {
            alert("医院信息添加成功！");
            addModal.style.display = "none";
            location.reload();  // 刷新页面以显示新数据
        } else {
            alert("添加医院信息失败：" + (data.message || ""));
        }
    })
    .catch(error => {
        alert("添加医院信息失败：" + error.message);
    });
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
