export function print_queue(item, index) {
  if(!queue_result.includes(item.exerciseName) && item.status === "completed")
  {
      console.log('(api) queue :: new exercise -', item.exerciseName);
      queue_result.push(item.exerciseName);
      var queue = document.getElementById("queue");
      
      var a1 = document.createElement('a');
      var a2 = document.createElement('a');
      var a3 = document.createElement('a');
      var br = document.createElement('br');
      
      var link1 = document.createTextNode("raw_video");
      var link2 = document.createTextNode("rendered_picture");
      var link3 = document.createTextNode("rendered_video");
      
      a1.appendChild(link1);
      a1.title = "raw_video";  
      a1.href = "https://romai.injurycloud.com/" + item.request_output.raw_video;
      a1.target = "_blank"

      a2.appendChild(link2);
      a2.title = "rendered_picture";  
      a2.href = "https://romai.injurycloud.com/" + item.request_output.rendered_picture;
      a2.target = "_blank"

      a3.appendChild(link3);
      a3.title = "rendered_video";  
      a3.href = "https://romai.injurycloud.com/" + item.request_output.rendered_video;
      a3.target = "_blank"
      
      queue.appendChild(document.createTextNode(item.exerciseName + " :: "));
      queue.appendChild(a1);
      queue.appendChild(document.createTextNode(" - "));
      queue.appendChild(a2);
      queue.appendChild(document.createTextNode(" - "));
      queue.appendChild(a3);
      queue.appendChild(br);
  }
  else
  {
      console.log('(api) queue :: no new exercise');
  }
}
