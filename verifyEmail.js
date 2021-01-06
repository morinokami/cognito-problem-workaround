const aws = require("aws-sdk");
const cognitoIdServiceProvider = new aws.CognitoIdentityServiceProvider();

exports.handler = async (event, _, callback) => {
  if (event.triggerSource === "CustomMessage_UpdateUserAttribute") {
    const email = event.request.userAttributes.email;
    const tempEmail = event.request.userAttributes["custom:temp_email"];
    if (tempEmail !== email) {
      // メールアドレスの変更を試みた場合の処理
      // tempEmail に現在のメールアドレスが入っている
      const params = {
        UserAttributes: [
          {
            Name: "email_verified",
            Value: "true",
          },
          {
            Name: "email",
            Value: tempEmail, // 現在のメールアドレスへと戻す
          },
          {
            Name: "custom:temp_email",
            Value: email, // 新しいメールアドレスを一時保存
          },
        ],
        UserPoolId: event.userPoolId,
        Username: event.userName,
      };
      await cognitoIdServiceProvider
        .adminUpdateUserAttributes(params)
        .promise();
    } else {
      // メールアドレスの確認が終わった際の処理
      // email も tempEmail も新しいメールアドレスが入っている
      const params = {
        UserAttributes: [
          {
            Name: "email_verified",
            Value: "true",
          },
          {
            Name: "email",
            Value: email, // 新しいメールアドレスへと書き換える
          },
          {
            Name: "custom:temp_email",
            Value: "",
          },
        ],
        UserPoolId: event.userPoolId,
        Username: event.userName,
      };
      await cognitoIdServiceProvider
        .adminUpdateUserAttributes(params)
        .promise();
      throw new Error("確認メール再送信を防ぐための意図的なエラー");
    }
  }

  callback(null, event);
};
