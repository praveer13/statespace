// sim/src/worker.rs: the worker's path for one command
pub fn submit(w: &mut Worker, c: &str) {
    w.begin();
    w.insert_command(c);
    w.insert_intent(c);
    w.commit(c);              // the command and its intent, one transaction
    w.dispatch(c);            // send the intent with its key
    w.arm_timer(c);
}

pub fn on_reply(w: &mut Worker, c: &str, reply: Reply) {
    w.receive(c, reply);
    w.ack(c);                 // mark the intent done
    w.persist(c);             // store the provider's result
}
