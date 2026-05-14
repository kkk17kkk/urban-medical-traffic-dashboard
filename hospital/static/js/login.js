<script type="text/javascript">
$(document).ready(function() {
        $("#loginButton").click(function(event) {
            event.preventDefault();
            var username = $('#username').val();
            var password = $('#password').val();

            // 检查输入是否为空
            if (!username || !password) {
                alert("用户名和密码不能为空！");
                return;
            }

            // 检查用户名是否为英文和数字
            if (!/^[a-zA-Z0-9]+$/.test(username)) {
                alert("用户名只能包含英文和数字！");
                return;
            }

            // 发送 AJAX 请求到服务器进行验证
            $.ajax({
                url: '/login/',
                type: 'POST',
                data: {
                    'username': username,
                    'password': password
                },
                success: function(response) {
                    if (response.success) {
                        alert("登录成功！");
                        window.location.href = "hospital/scanboard/";
                    } else {
                        alert("用户名或密码错误！");
                    }
                },
                error: function() {
                    alert("登录请求失败！");
                }
            }
            );
        }
        )});
</script>