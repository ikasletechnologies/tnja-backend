<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
require 'vendor/autoload.php';


  // $_POST['email'] = '97arunkumar@gmail.com';
  //    $_POST['name']= 'arun';
  //   $_POST['number']= '8760869467';
  //    $_POST['subject']= 'arun';
  // $_POST['message']= 'test';


if(isset($_POST['email']))  
{
 
    $email     = $_POST['email'];
    $firstName = $_POST['firstName'];
    $lastName  = $_POST['lastName'];
    $name      = $firstName . ' ' . $lastName; 
    $mobile    = $_POST['phone'];
    $subject   = "Enquire From Website";
    $msg       = $_POST['message']; 



     $from  = [
        'host'=>'smtp.gmail.com',
        'email'=>'ikasletechnologyservices@gmail.com',
        'password'=>'ocup ccca mhev hksb',
        'port'=>'587',
        'name'=>'Kiddos Foods'
     ];
     
     $to = [
        'email'=>'naveenkumar79110@gmail.com',
        'name'=>$subject.' | '. $name
     ];
     $data = [
        'subject'=>'New Lead Received from Website',
        'body'=>'<!DOCTYPE html>
<html>
<head>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap");

    body {
      margin: 0;
      font-family: "Roboto", sans-serif;
      background: #7367f0;
      color: #333;
    }

    .email-container {
      max-width: 600px;
      margin: auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      animation: fadeIn 1s ease-in-out;
    }

    .logo {
      text-align: center;
      margin-bottom: 20px;
    }

    .logo img {
      max-width: 200px;
    }

    h2 {
      text-align: center;
      color: #7367f0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    table td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }

    table td:first-child {
      font-weight: bold;
      color: #1e3a8a;
      width: 40%;
    }

    @keyframes fadeIn {
      from {opacity: 0; transform: translateY(20px);}
      to {opacity: 1; transform: translateY(0);}
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
     <img src="https://chimpsoda.com/assets/images/main-logo.png"  alt="chimp Logo" />
    </div>
    <h2>New Lead Received from Website</h2>
    <table>
      <tr>
        <td>Full Name</td>
        <td>'.$name .'</td>
      </tr>
      <tr>
        <td>Subject</td>
        <td>'.$subject.'</td>
      </tr>
     
      <tr>
        <td>Email</td>
        <td>'.$email.'}</td>
      </tr>
      <tr>
        <td>Mobile Number</td>
        <td>'.$mobile.'</td>
      </tr>
      <tr>
        <td>Message</td>
        <td>'.$msg.'</td>
      </tr>
    </table>
  </div>
</body>
</html>
',

     ];
     
     $thank_to = [
        'email'=>$email,
       'name'=>'Thank You for Contacting chimp'
     ];
      $thank_data = ['subject'=>'Thank You for Contacting chimp',
        'body'=>'<!DOCTYPE html>
                        <html>
                        <head>
                          <style>
                            @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap");
                        
                            body {
                              margin: 0;
                              font-family: "Roboto", sans-serif;
                              background: #7367f0;
                              color: #333;
                            }
                        
                            .email-container {
                              max-width: 600px;
                              margin: auto;
                              background: white;
                              padding: 30px;
                              border-radius: 10px;
                              box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                              animation: fadeIn 1s ease-in-out;
                            }
                        
                            .logo {
                              text-align: center;
                              margin-bottom: 20px;
                            }
                        
                            .logo img {
                              max-width: 200px;
                            }
                        
                            h2 {
                              text-align: center;
                              color: #7367f0;
                            }
                        
                            table {
                              width: 100%;
                              border-collapse: collapse;
                              margin-top: 20px;
                            }
                        
                            table td {
                              padding: 12px;
                              border-bottom: 1px solid #ddd;
                            }
                        
                            table td:first-child {
                              font-weight: bold;
                              color: #1e3a8a;
                              width: 40%;
                            }
                        
                            @keyframes fadeIn {
                              from {opacity: 0; transform: translateY(20px);}
                              to {opacity: 1; transform: translateY(0);}
                            }
                          </style>
                        </head>
                        <body>
                          <div class="email-container">
                            <div class="logo">
                             <img src="https://chimpsoda.com/assets/images/main-logo.png"  alt="chimp Logo" />
                            </div>
                             <h1>Thank You for Reaching Out!</h1>
                            <p>Hi '.$name.',</p>
                            <p>Thank you for reaching out to us about <strong>'.$subject.'</strong>.</p>
                            <p>We’re excited to connect with you! Our team will get in touch with you shortly to assist further. </p>
                            <p>Cheers,<br><strong>Chimp Premium Soda Team</strong></p>
                          </div>
                        </body>
                        </html>
                        ',
        ];
    $send  =  _mail($from, $to, $data);
    
    $thank  =  _mail($from, $thank_to, $thank_data);
     
     die(json_encode($send));
}


function _mail($from, $to, $data) {


    ## structure
    //  $from  => [
    //     'host'=>'smtp.gmail.com',
    //     'email'=>'saravanavideos@gmail.com',
    //     'password'=>'rtfq xhjo rfvx scrt',
    //     'port'=>'587',
    //     'name'=>'akvinz'
    //  ];
    //  $to = [
    //     'email'=>'',
    //     'name'=>''
    //  ];
    //  $data = [
    //     'subject'=>'',
    //     'body'=>'',

    //  ];

    global $conn;
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = $from['host'] ?? 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = $from['email']; 
        $mail->Password   = $from['password'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = $from['port'] ?? 587;

        $mail->setFrom($from['email'], $from['name']);
        $mail->addAddress($to['email'], $to['name']);

        $mail->Subject = $data['subject'] ?? 'No Subject';
        $mail->isHTML(true);
        $mail->Body = $data['body'] ?? 'No content';

        if ($mail->send()) {
            $error_report['is_error']="false";
            $error_report['report_code'] = 0;
            $error_report['status'] = "success";
            $error_report['data'] = "";
            $error_report['info']='';
        } else {
            $error_report['is_error']="true";
            $error_report['report_code'] = 1;
            $error_report['status'] = "failed";
            $error_report['data'] = "";
            $error_report['info']=mysqli_error($conn);
        }

    } catch (Exception $e) {
        
        $error_report['is_error']="true";
        $error_report['report_code'] = 1;
        $error_report['status'] = "failed";
        $error_report['data'] = "";
        $error_report['info']=$mail->ErrorInfo;
    }
    return($error_report);
}


function _mailAttr($a)
{
    $tmpE  = explode('-',$a);
                            $data ='';
                            $getAppAttr  =  selectDataApi('apps','id="'.$tmpE[0].'"');
                            if($getAppAttr->num_rows>0)
                            {
                                $getAttrRow  = $getAppAttr->fetch_assoc();
                             
                                if(!empty($getAttrRow['email_config']))
                                {
                                    
                                    $tmpD  = json_decode($getAttrRow['email_config'],true);
                                   
                                    foreach($tmpD as $d)
                                    {
                                       
                                        if($d['e_id'] ==  $tmpE[1])
                                        {
                                          
                                           $data  =  $d;
                                           
                                        }
                                    }
                                }

                                $error_report['is_error']="false";
                                $error_report['report_code'] = 0;
                                $error_report['status'] = "success";
                                $error_report['data'] = $data;
                                $error_report['info']='no data found';
                            }else
                            {
                                $error_report['is_error']="true";
                                $error_report['report_code'] = 1;
                                $error_report['status'] = "failed";
                                $error_report['data'] = "";
                                $error_report['info']='no data found';
                            }

                            return($error_report);
}
?>
